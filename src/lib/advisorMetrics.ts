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

export interface DayOfWeekStats {
  day: string;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  netR: number;
}

export interface BehavioralMetrics {
  revengeTradesCount: number; // trades entered < 20 min after a loss
  revengeLossR: number;
  maxConsecutiveLosses: number;
  maxTradesInSingleDay: number;
  riskEscalationsCount: number; // trades where riskPercent exceeded 1.5x of trader's median risk
  medianRiskPercent: number | null;
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
  daysOfWeek: DayOfWeekStats[];
  behavioral: BehavioralMetrics;
  topMistakes: MistakeStat[];
}

export interface AdvisorTradeRecord {
  id: string;
  date: string;
  time?: string;
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

export interface AdvisorSystemSection {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
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
  systemSections: AdvisorSystemSection[];
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
  const defaultDaysOfWeek: DayOfWeekStats[] = [
    { day: 'Monday', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
    { day: 'Tuesday', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
    { day: 'Wednesday', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
    { day: 'Thursday', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
    { day: 'Friday', tradesCount: 0, winCount: 0, lossCount: 0, winRate: 0, netR: 0 },
  ];

  const defaultBehavioral: BehavioralMetrics = {
    revengeTradesCount: 0,
    revengeLossR: 0,
    maxConsecutiveLosses: 0,
    maxTradesInSingleDay: 0,
    riskEscalationsCount: 0,
    medianRiskPercent: null,
  };

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
      daysOfWeek: defaultDaysOfWeek,
      behavioral: defaultBehavioral,
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

  // 2. Day of Week Breakdown (Monday - Friday)
  const dayNameList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysMap = new Map<string, { count: number; wins: number; losses: number; netR: number }>();
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach((d) => {
    daysMap.set(d, { count: 0, wins: 0, losses: 0, netR: 0 });
  });

  enriched.forEach((t) => {
    if (t.trade_date) {
      const d = new Date(t.trade_date);
      if (!isNaN(d.getTime())) {
        const dayName = dayNameList[d.getUTCDay()];
        const entry = daysMap.get(dayName) || { count: 0, wins: 0, losses: 0, netR: 0 };
        entry.count++;
        if (t.outcome === 'TP') entry.wins++;
        if (t.outcome === 'SL') entry.losses++;
        entry.netR += t.pnl_r;
        daysMap.set(dayName, entry);
      }
    }
  });

  const daysOfWeek: DayOfWeekStats[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    .map((day) => {
      const d = daysMap.get(day) || { count: 0, wins: 0, losses: 0, netR: 0 };
      return {
        day,
        tradesCount: d.count,
        winCount: d.wins,
        lossCount: d.losses,
        winRate: d.count > 0 ? Number(((d.wins / d.count) * 100).toFixed(1)) : 0,
        netR: Number(d.netR.toFixed(2)),
      };
    });

  // 3. Behavioral & Tilt Metrics
  const getTradeTs = (tr: RawTrade) => {
    if (tr.trade_date && tr.trade_date.includes('T')) {
      const ts = new Date(tr.trade_date).getTime();
      if (!isNaN(ts)) return ts;
    }
    if (tr.created_at) {
      const ts = new Date(tr.created_at).getTime();
      if (!isNaN(ts)) return ts;
    }
    if (tr.trade_date) {
      const ts = new Date(tr.trade_date).getTime();
      if (!isNaN(ts)) return ts;
    }
    return 0;
  };

  const chronoTrades = [...enriched].sort((a, b) => getTradeTs(a) - getTradeTs(b));

  // Max consecutive losses
  let currentStreak = 0;
  let maxConsecutiveLosses = 0;
  chronoTrades.forEach((t) => {
    const isLoss = t.outcome === 'SL' || t.pnl_r < 0;
    const isWin = t.outcome === 'TP' || t.pnl_r > 0;
    if (isLoss) {
      currentStreak++;
      if (currentStreak > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentStreak;
      }
    } else if (isWin) {
      currentStreak = 0;
    }
  });

  // Max trades in a single day
  const tradesPerDayMap = new Map<string, number>();
  chronoTrades.forEach((t) => {
    const dayKey = t.trade_date ? t.trade_date.split('T')[0] : 'unknown';
    tradesPerDayMap.set(dayKey, (tradesPerDayMap.get(dayKey) || 0) + 1);
  });
  let maxTradesInSingleDay = 0;
  tradesPerDayMap.forEach((cnt) => {
    if (cnt > maxTradesInSingleDay) maxTradesInSingleDay = cnt;
  });

  // Revenge trades entered <= 20 min after a loss
  let revengeTradesCount = 0;
  let revengeLossR = 0;
  for (let i = 1; i < chronoTrades.length; i++) {
    const prev = chronoTrades[i - 1];
    const curr = chronoTrades[i];
    const prevTs = getTradeTs(prev);
    const currTs = getTradeTs(curr);

    const prevWasLoss = prev.outcome === 'SL' || prev.pnl_r < 0;
    if (prevWasLoss && prevTs > 0 && currTs > 0 && currTs >= prevTs) {
      const diffMinutes = (currTs - prevTs) / (1000 * 60);
      if (diffMinutes > 0 && diffMinutes <= 20) {
        revengeTradesCount++;
        if (curr.pnl_r < 0) {
          revengeLossR += Math.abs(curr.pnl_r);
        }
      }
    }
  }

  // Median risk and risk escalations (> 1.5x median risk)
  const risks = chronoTrades
    .map((t) => Number(t.risk_percent))
    .filter((r) => !isNaN(r) && r > 0)
    .sort((a, b) => a - b);

  let medianRiskPercent: number | null = null;
  let riskEscalationsCount = 0;
  if (risks.length > 0) {
    const mid = Math.floor(risks.length / 2);
    medianRiskPercent = risks.length % 2 !== 0 ? risks[mid] : Number(((risks[mid - 1] + risks[mid]) / 2).toFixed(2));
    if (medianRiskPercent && medianRiskPercent > 0) {
      const threshold = 1.5 * medianRiskPercent;
      riskEscalationsCount = risks.filter((r) => r > threshold).length;
    }
  }

  const behavioral: BehavioralMetrics = {
    revengeTradesCount,
    revengeLossR: Number(revengeLossR.toFixed(2)),
    maxConsecutiveLosses,
    maxTradesInSingleDay,
    riskEscalationsCount,
    medianRiskPercent,
  };

  // 4. Mistake tags breakdown
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
    daysOfWeek,
    behavioral,
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
 * Strips HTML tags and preserves readable spacing from rich text / TipTap content.
 */
function cleanSectionContent(htmlOrText: string): string {
  if (!htmlOrText) return '';
  return htmlOrText
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Builds a complete context package for the AI Advisor, giving it access to
 * all trades (with notes & mistakes), playbooks/setups, accounts, system sections, and breakdowns.
 */
export function buildFullAdvisorContext(
  trades: RawTrade[],
  accounts: TradingAccount[] = [],
  playbooks: Array<{ id: string; title: string; description?: string | null; is_active?: boolean }> = [],
  mistakes: Array<{ id: string; name: string }> = [],
  systemSections: Array<{ id: string; title: string; content: string; order_index?: number }> = []
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

  const cleanedSections: AdvisorSystemSection[] = (systemSections || []).map((s) => ({
    id: s.id,
    title: s.title,
    content: cleanSectionContent(s.content),
    orderIndex: s.order_index ?? 0,
  }));

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
      systemSections: cleanedSections,
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
    systemSections: cleanedSections,
    mistakes: mistakesResult,
    tradesLog: tradesLog.slice(0, 150),
  };
}
