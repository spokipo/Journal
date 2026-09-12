import { enrichTradesWithHistoricalData, calculateStatistics, type RawTrade, type TradingAccount } from './statsEngine';

export interface SessionStats {
  session: string;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  winRate: number; // percentage
  netR: number;
}

export interface MistakeStat {
  name: string;
  count: number;
  totalLossR: number;
}

export interface MacroEvent {
  currency: string;
  time: string;
  title: string;
  forecast: string;
  actual: string;
  impact: 'HIGH' | 'MED' | 'LOW';
}

export interface AdvisorAggregates {
  winRate: number;
  profitFactor: number;
  avgRR: number;
  maxDrawdownR: number;
  maxDrawdownPercent: number | null;
  totalTrades: number;
  netR: number;
  sessions: SessionStats[];
  topMistakes: MistakeStat[];
}

export interface AdvisorTradeRecord {
  id: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  session: string;
  outcome: 'TP' | 'SL' | 'BE';
  pnlR: number;
  pnlPercent?: number;
  pnlAmount?: number | null;
  rr?: number;
  riskPercent?: number;
  setupName?: string;
  mistakes: string[];
  accountName?: string;
  notes?: string;
}

export interface AdvisorPlaybookRecord {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  tradesCount: number;
  winRate: number;
  netR: number;
}

export interface AdvisorAccountRecord {
  id: string;
  name: string;
  scope: 'personal' | 'prop';
  currency: string;
  balance: number;
  initialBalance?: number;
}

export interface AdvisorMistakeRecord {
  id: string;
  name: string;
  occurrences: number;
  totalLossR: number;
}

export interface AdvisorBreakdownItem {
  name: string;
  tradesCount: number;
  winRate: number;
  netR: number;
  profitFactor: number;
}

export interface FullAdvisorContext {
  aggregates: AdvisorAggregates;
  bySetup: AdvisorBreakdownItem[];
  byDirection: AdvisorBreakdownItem[];
  accounts: AdvisorAccountRecord[];
  playbooks: AdvisorPlaybookRecord[];
  mistakes: AdvisorMistakeRecord[];
  tradesLog: AdvisorTradeRecord[];
}

/**
 * Classifies a trade's session into granular trading sessions:
 * London, NY AM, NY PM, Asian, or Off-Session.
 */
function classifySession(trade: RawTrade): string {
  const sess = (trade.session || '').toUpperCase();
  if (sess === 'LONDON') return 'London';
  if (sess === 'ASIA') return 'Asian';
  if (sess === 'OFF_SESSION') return 'Off-Session';

  if (sess === 'NEW_YORK' || sess === 'NY') {
    if (trade.trade_date && trade.trade_date.includes('T')) {
      try {
        const date = new Date(trade.trade_date);
        const hours = date.getUTCHours();
        // NY trading: 13:30 - 20:00 UTC (9:30 AM - 4:00 PM EST)
        // AM session: < 17:00 UTC (12:00 PM EST)
        if (hours < 17) {
          return 'NY AM';
        } else {
          return 'NY PM';
        }
      } catch {
        return 'NY AM';
      }
    }
    return 'NY AM';
  }

  return 'London';
}

/**
 * Computes user performance metrics from raw trades, accounts, and mistake tags.
 */
export function computeAdvisorMetrics(
  trades: RawTrade[],
  accounts: TradingAccount[],
  mistakesMap: Record<string, string> = {}
): AdvisorAggregates {
  if (!trades || trades.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      avgRR: 0,
      maxDrawdownR: 0,
      maxDrawdownPercent: null,
      totalTrades: 0,
      netR: 0,
      sessions: [
        { session: 'London', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
        { session: 'NY AM', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
        { session: 'NY PM', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
      ],
      topMistakes: [],
    };
  }

  const enriched = enrichTradesWithHistoricalData(trades, accounts);
  const summary = calculateStatistics(enriched, {}, mistakesMap);

  // 1. Session Breakdown with London / NY AM / NY PM
  const sessionMap = new Map<string, { count: number; wins: number; losses: number; netR: number }>();
  
  // Ensure default requested sessions are present
  ['London', 'NY AM', 'NY PM'].forEach((s) => {
    sessionMap.set(s, { count: 0, wins: 0, losses: 0, netR: 0 });
  });

  enriched.forEach((t) => {
    const sessionKey = classifySession(t);
    const existing = sessionMap.get(sessionKey) || { count: 0, wins: 0, losses: 0, netR: 0 };
    existing.count++;
    if (t.outcome === 'TP') existing.wins++;
    if (t.outcome === 'SL') existing.losses++;
    existing.netR += t.pnl_r;
    sessionMap.set(sessionKey, existing);
  });

  const sessionStats: SessionStats[] = Array.from(sessionMap.entries())
    .map(([session, data]) => ({
      session,
      tradesCount: data.count,
      winCount: data.wins,
      lossCount: data.losses,
      winRate: data.count > 0 ? Number(((data.wins / data.count) * 100).toFixed(1)) : 0,
      netR: Number(data.netR.toFixed(2)),
    }))
    .sort((a, b) => b.tradesCount - a.tradesCount);

  // 2. Mistake tags breakdown
  const mistakeCountMap = new Map<string, { count: number; totalLossR: number }>();
  enriched.forEach((t) => {
    if (t.mistake_ids && Array.isArray(t.mistake_ids)) {
      t.mistake_ids.forEach((mId) => {
        const name = mistakesMap[mId] || mId;
        const current = mistakeCountMap.get(name) || { count: 0, totalLossR: 0 };
        current.count++;
        if (t.pnl_r < 0) {
          current.totalLossR += Math.abs(t.pnl_r);
        }
        mistakeCountMap.set(name, current);
      });
    }
  });

  const topMistakes: MistakeStat[] = Array.from(mistakeCountMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalLossR: Number(data.totalLossR.toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Avg R:R calculation
  const avgRR = summary.avgLossR > 0 ? Number((summary.avgWinR / summary.avgLossR).toFixed(2)) : summary.avgWinR;

  return {
    winRate: summary.winRate,
    profitFactor: summary.profitFactorR,
    avgRR,
    maxDrawdownR: summary.maxDrawdownR,
    maxDrawdownPercent: summary.maxDrawdownPercent,
    totalTrades: summary.totalTrades,
    netR: summary.netR,
    sessions: sessionStats,
    topMistakes,
  };
}

import { getTodayMacroEvents as getLiveTodayMacroEvents, type TodayMacroEvent } from './economicCalendar';

/**
 * Returns today's real economic calendar releases from live feed.
 */
export async function getTodayMacroEvents(): Promise<TodayMacroEvent[]> {
  return await getLiveTodayMacroEvents();
}

/**
 * Builds a complete context package for the AI Advisor, giving it access to
 * all trades (with notes & mistakes), playbooks/setups, accounts, and breakdowns.
 */
export function buildFullAdvisorContext(
  trades: RawTrade[],
  accounts: TradingAccount[] = [],
  playbooks: Array<{ id: string; title: string; description?: string | null; is_active?: boolean }> = [],
  mistakes: Array<{ id: string; name: string }> = []
): FullAdvisorContext {
  const mistakesMap: Record<string, string> = {};
  mistakes.forEach((m) => {
    if (m?.id && m?.name) mistakesMap[m.id] = m.name;
  });

  const playbooksMap: Record<string, string> = {};
  playbooks.forEach((p) => {
    if (p?.id && p?.title) playbooksMap[p.id] = p.title;
  });

  const accountsMap: Record<string, string> = {};
  accounts.forEach((a) => {
    if (a?.id && a?.name) accountsMap[a.id] = a.name;
  });

  const aggregates = computeAdvisorMetrics(trades, accounts, mistakesMap);

  if (!trades || trades.length === 0) {
    return {
      aggregates,
      bySetup: [],
      byDirection: [],
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        scope: a.scope,
        currency: a.currency || 'USD',
        balance: a.balance || 0,
        initialBalance: a.initial_balance,
      })),
      playbooks: playbooks.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || null,
        isActive: p.is_active ?? true,
        tradesCount: 0,
        winRate: 0,
        netR: 0,
      })),
      mistakes: mistakes.map((m) => ({
        id: m.id,
        name: m.name,
        occurrences: 0,
        totalLossR: 0,
      })),
      tradesLog: [],
    };
  }

  const enriched = enrichTradesWithHistoricalData(trades, accounts);

  // 1. By Setup Breakdown
  const setupStatsMap = new Map<string, { name: string; total: number; wins: number; netR: number; winR: number; lossR: number }>();
  // 2. By Direction Breakdown
  const directionStatsMap = new Map<string, { name: string; total: number; wins: number; netR: number; winR: number; lossR: number }>();
  // 3. Mistakes summary
  const mistakeLossMap = new Map<string, { id: string; name: string; occurrences: number; totalLossR: number }>();

  mistakes.forEach((m) => {
    mistakeLossMap.set(m.id, { id: m.id, name: m.name, occurrences: 0, totalLossR: 0 });
  });

  const tradesLog: AdvisorTradeRecord[] = [];

  enriched.forEach((t) => {
    const r = Number(t.pnl_r || 0);
    const isWin = t.outcome === 'TP' || r > 0;
    const isLoss = t.outcome === 'SL' || r < 0;

    // By Setup
    const setupId = t.setup_id || 'none';
    const setupName = setupId === 'none' ? 'Без сетапа' : (playbooksMap[setupId] || 'Неизвестный сетап');
    const currSetup = setupStatsMap.get(setupId) || { name: setupName, total: 0, wins: 0, netR: 0, winR: 0, lossR: 0 };
    currSetup.total += 1;
    if (isWin) {
      currSetup.wins += 1;
      currSetup.winR += r;
    }
    if (isLoss) {
      currSetup.lossR += Math.abs(r);
    }
    currSetup.netR += r;
    setupStatsMap.set(setupId, currSetup);

    // By Direction
    const dir = t.direction || 'LONG';
    const currDir = directionStatsMap.get(dir) || { name: dir, total: 0, wins: 0, netR: 0, winR: 0, lossR: 0 };
    currDir.total += 1;
    if (isWin) {
      currDir.wins += 1;
      currDir.winR += r;
    }
    if (isLoss) {
      currDir.lossR += Math.abs(r);
    }
    currDir.netR += r;
    directionStatsMap.set(dir, currDir);

    // Mistakes mapping
    const tradeMistakeNames: string[] = [];
    if (t.mistake_ids && Array.isArray(t.mistake_ids)) {
      t.mistake_ids.forEach((mId) => {
        const mName = mistakesMap[mId] || mId;
        tradeMistakeNames.push(mName);
        const existing = mistakeLossMap.get(mId) || { id: mId, name: mName, occurrences: 0, totalLossR: 0 };
        existing.occurrences += 1;
        if (r < 0) {
          existing.totalLossR += Math.abs(r);
        }
        mistakeLossMap.set(mId, existing);
      });
    }

    tradesLog.push({
      id: t.id,
      date: t.trade_date ? t.trade_date.split('T')[0] : '',
      symbol: t.symbol,
      direction: t.direction,
      session: classifySession(t),
      outcome: t.outcome,
      pnlR: Number(r.toFixed(2)),
      pnlPercent: t.pnl_percent !== null && t.pnl_percent !== undefined ? Number(t.pnl_percent.toFixed(2)) : undefined,
      pnlAmount: t.pnl_amount !== null && t.pnl_amount !== undefined ? Number(t.pnl_amount.toFixed(2)) : null,
      rr: t.rr ? Number(t.rr) : undefined,
      riskPercent: t.risk_percent ? Number(t.risk_percent) : undefined,
      setupName,
      mistakes: tradeMistakeNames,
      accountName: t.account_id ? (accountsMap[t.account_id] || t.account_name) : undefined,
      notes: t.notes ? t.notes.trim() : undefined,
    });
  });

  const bySetup: AdvisorBreakdownItem[] = Array.from(setupStatsMap.values())
    .map((s) => ({
      name: s.name,
      tradesCount: s.total,
      winRate: s.total > 0 ? Number(((s.wins / s.total) * 100).toFixed(1)) : 0,
      netR: Number(s.netR.toFixed(2)),
      profitFactor: s.lossR === 0 ? Number(s.winR.toFixed(2)) : Number((s.winR / s.lossR).toFixed(2)),
    }))
    .sort((a, b) => b.tradesCount - a.tradesCount);

  const byDirection: AdvisorBreakdownItem[] = Array.from(directionStatsMap.values())
    .map((d) => ({
      name: d.name,
      tradesCount: d.total,
      winRate: d.total > 0 ? Number(((d.wins / d.total) * 100).toFixed(1)) : 0,
      netR: Number(d.netR.toFixed(2)),
      profitFactor: d.lossR === 0 ? Number(d.winR.toFixed(2)) : Number((d.winR / d.lossR).toFixed(2)),
    }));

  const playbooksResult: AdvisorPlaybookRecord[] = playbooks.map((p) => {
    const stats = setupStatsMap.get(p.id);
    return {
      id: p.id,
      title: p.title,
      description: p.description || null,
      isActive: p.is_active ?? true,
      tradesCount: stats?.total || 0,
      winRate: stats && stats.total > 0 ? Number(((stats.wins / stats.total) * 100).toFixed(1)) : 0,
      netR: stats ? Number(stats.netR.toFixed(2)) : 0,
    };
  });

  const mistakesResult: AdvisorMistakeRecord[] = Array.from(mistakeLossMap.values())
    .map((m) => ({
      id: m.id,
      name: m.name,
      occurrences: m.occurrences,
      totalLossR: Number(m.totalLossR.toFixed(2)),
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const accountsResult: AdvisorAccountRecord[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    scope: a.scope,
    currency: a.currency || 'USD',
    balance: a.balance || 0,
    initialBalance: a.initial_balance,
  }));

  // Sort trades log by date descending (most recent first)
  tradesLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    aggregates,
    bySetup,
    byDirection,
    accounts: accountsResult,
    playbooks: playbooksResult,
    mistakes: mistakesResult,
    tradesLog: tradesLog.slice(0, 150),
  };
}
