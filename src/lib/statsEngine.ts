export interface TradingAccount {
  id: string;
  user_id?: string;
  name: string;
  scope: 'personal' | 'prop';
  prop_mode?: 'live' | 'challenge' | null;
  currency: string;
  balance: number;
  initial_balance?: number;
  current_balance?: number;
  is_default?: boolean;
  is_archived?: boolean;
  created_at?: string;
}

export interface RawTrade {
  id: string;
  user_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  session: 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OFF_SESSION';
  risk_percent: number;
  rr: number;
  outcome: 'TP' | 'SL' | 'BE';
  pnl_r?: number | null;
  pnl_percent?: number | null;
  setup_id?: string | null;
  mistake_ids?: string[];
  account_id?: string | null;
  idea_id?: string | null;
  notes?: string | null;
  screenshots?: string[];
  timeframe?: string | null;
  trade_date: string;
  created_at?: string;
}

export interface EnrichedTrade extends RawTrade {
  account_name?: string;
  account_currency?: string;
  account_balance_before?: number | null;
  account_balance_after?: number | null;
  risk_amount?: number | null;
  pnl_r: number;
  pnl_percent: number;
  pnl_amount?: number | null;
}

export type PeriodType = 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type SortOption = 
  | 'date_desc' 
  | 'date_asc' 
  | 'pnl_r_desc' 
  | 'pnl_r_asc' 
  | 'pnl_amt_desc' 
  | 'pnl_amt_asc' 
  | 'symbol_asc' 
  | 'symbol_desc';

export interface FilterState {
  period: PeriodType;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  accountId: string;        // 'all' or specific account id
  timeframe?: string;       // 'all' or specific timeframe like '5m'
  searchQuery?: string;
}

export interface EquityPoint {
  tradeId: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  outcome: 'TP' | 'SL' | 'BE';
  pnlR: number;
  pnlAmount?: number | null;
  cumulativeR: number;
  cumulativeAmount?: number | null;
  totalBalance?: number | null;
  accountName?: string;
}

export interface BreakdownMetric {
  key: string;
  label: string;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  beCount: number;
  winRate: number;
  netR: number;
  netAmount: number | null;
  profitFactor: number;
}

export interface DailyPnlItem {
  date: string; // YYYY-MM-DD
  tradesCount: number;
  netR: number;
  netAmount: number | null;
  winCount: number;
  lossCount: number;
}

export interface StatsSummary {
  hasMonetaryStats: boolean;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  beCount: number;
  winRate: number;       // percentage (0-100)
  lossRate: number;      // percentage (0-100)
  beRate: number;        // percentage (0-100)
  
  netR: number;
  grossWinR: number;
  grossLossR: number;
  profitFactorR: number;
  expectancyR: number;   // avg R per trade
  avgWinR: number;
  avgLossR: number;
  winLossRatioR: number;
  maxDrawdownR: number;

  netAmount: number | null;
  grossWinAmount: number | null;
  grossLossAmount: number | null;
  profitFactorAmount: number | null;
  expectancyAmount: number | null; // avg $ per trade
  avgWinAmount: number | null;
  avgLossAmount: number | null;
  maxDrawdownAmount: number | null;
  maxDrawdownPercent: number | null;

  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;

  equityCurve: EquityPoint[];
  dailyPnl: DailyPnlItem[];
  bySession: BreakdownMetric[];
  byTimeframe: BreakdownMetric[];
  byDirection: BreakdownMetric[];
  bySetup: BreakdownMetric[];
  byMistake: BreakdownMetric[];
}

/**
 * 1. Historical Balance & Monetary PnL Calculation
 * 
 * Accurately tracks each account chronologically starting from initial_balance
 * so that historical trades reflect the account's state and risk at the time of execution,
 * rather than erroneously recalculating using current balance.
 */
export function enrichTradesWithHistoricalData(
  trades: RawTrade[],
  accounts: TradingAccount[]
): EnrichedTrade[] {
  if (!trades || trades.length === 0) return [];

  const accountMap = new Map<string, TradingAccount>();
  accounts.forEach((acc) => accountMap.set(String(acc.id), acc));

  // Group trades by valid account; separate trades without an account
  const tradesByAccount = new Map<string, RawTrade[]>();
  const unassignedTrades: RawTrade[] = [];

  trades.forEach((trade) => {
    const accId = trade.account_id ? String(trade.account_id) : null;
    if (accId && accountMap.has(accId)) {
      const existing = tradesByAccount.get(accId) || [];
      existing.push(trade);
      tradesByAccount.set(accId, existing);
    } else {
      unassignedTrades.push(trade);
    }
  });

  const enrichedList: EnrichedTrade[] = [];

  // Helper to calculate normalized R
  const getNormalizedR = (trade: RawTrade): number => {
    if (trade.pnl_r !== null && trade.pnl_r !== undefined && Number(trade.pnl_r) !== 0) {
      return Number(trade.pnl_r);
    } else if (trade.outcome === 'TP') {
      const rr = Number(trade.rr || 0);
      return rr > 0 ? rr : (Number(trade.pnl_r) || 2.0);
    } else if (trade.outcome === 'SL') {
      const rr = trade.rr !== null && trade.rr !== undefined ? Number(trade.rr) : -1.0;
      return rr < 0 ? rr : -1.0;
    }
    return 0.0;
  };

  // 1. Process trades for each real account independently
  tradesByAccount.forEach((accTrades, accId) => {
    const account = accountMap.get(accId)!;
    const startingBalance = Number(
      account.initial_balance !== undefined && account.initial_balance !== null && Number(account.initial_balance) > 0
        ? account.initial_balance
        : account.balance !== undefined && account.balance !== null && Number(account.balance) > 0
        ? account.balance
        : 0
    );

    const sortedTrades = [...accTrades].sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );

    let rollingBalance = startingBalance;
    const canCalculateDollars = startingBalance > 0;

    sortedTrades.forEach((trade) => {
      const r = getNormalizedR(trade);
      const riskPct = Number(trade.risk_percent || 1.0);

      let pnlPct = 0;
      if (
        trade.pnl_percent !== null &&
        trade.pnl_percent !== undefined &&
        (Number(trade.pnl_percent) !== 0 || trade.outcome === 'BE')
      ) {
        pnlPct = Number(trade.pnl_percent);
      } else {
        pnlPct = Number((r * riskPct).toFixed(4));
      }

      if (canCalculateDollars) {
        const balanceBefore = rollingBalance;
        const riskAmount = (balanceBefore * riskPct) / 100;

        let pnlAmount = 0;
        if (
          trade.pnl_percent !== null &&
          trade.pnl_percent !== undefined &&
          (Number(trade.pnl_percent) !== 0 || trade.outcome === 'BE')
        ) {
          pnlAmount = Number(((balanceBefore * Number(trade.pnl_percent)) / 100).toFixed(2));
        } else {
          pnlAmount = Number((riskAmount * r).toFixed(2));
        }
        const balanceAfter = Number((balanceBefore + pnlAmount).toFixed(2));
        rollingBalance = balanceAfter;

        enrichedList.push({
          ...trade,
          account_name: account.name,
          account_currency: account.currency || 'USD',
          account_balance_before: balanceBefore,
          account_balance_after: balanceAfter,
          risk_amount: riskAmount,
          pnl_r: r,
          pnl_percent: pnlPct,
          pnl_amount: pnlAmount,
        });
      } else {
        // Account has zero/missing balance: cannot calculate dollar amounts
        enrichedList.push({
          ...trade,
          account_name: account.name,
          account_currency: account.currency || 'USD',
          account_balance_before: null,
          account_balance_after: null,
          risk_amount: null,
          pnl_r: r,
          pnl_percent: pnlPct,
          pnl_amount: null,
        });
      }
    });
  });

  // 2. Process unassigned trades (trades with NO account)
  // If there is no account, we cannot calculate PnL in dollars!
  unassignedTrades.forEach((trade) => {
    const r = getNormalizedR(trade);
    const riskPct = Number(trade.risk_percent || 1.0);

    let pnlPct = 0;
    if (
      trade.pnl_percent !== null &&
      trade.pnl_percent !== undefined &&
      (Number(trade.pnl_percent) !== 0 || trade.outcome === 'BE')
    ) {
      pnlPct = Number(trade.pnl_percent);
    } else {
      pnlPct = Number((r * riskPct).toFixed(4));
    }

    enrichedList.push({
      ...trade,
      account_name: undefined,
      account_currency: undefined,
      account_balance_before: null,
      account_balance_after: null,
      risk_amount: null,
      pnl_r: r,
      pnl_percent: pnlPct,
      pnl_amount: null,
    });
  });

  // Return all enriched trades sorted chronologically
  return enrichedList.sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
}

/**
 * 2. Date Filtering Helpers
 */
export function getPeriodDateRange(period: PeriodType, customStart?: string, customEnd?: string): { start?: Date; end?: Date } {
  const now = new Date();
  
  if (period === 'all') {
    return {};
  }

  if (period === 'custom') {
    return {
      start: customStart ? new Date(`${customStart}T00:00:00`) : undefined,
      end: customEnd ? new Date(`${customEnd}T23:59:59.999`) : undefined,
    };
  }

  if (period === 'week') {
    // Current week starting Monday
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (period === 'month') {
    // Current month from 1st
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end: now };
  }

  if (period === 'quarter') {
    // Current quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
    return { start, end: now };
  }

  if (period === 'year') {
    // Current year from Jan 1
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { start, end: now };
  }

  return {};
}

/**
 * 3. Filter Application Engine
 */
export function filterTrades(trades: EnrichedTrade[], filters: FilterState): EnrichedTrade[] {
  const { start, end } = getPeriodDateRange(filters.period, filters.customStartDate, filters.customEndDate);

  return trades.filter((trade) => {
    const tradeTime = new Date(trade.trade_date).getTime();

    // Period / Date filter
    if (start && tradeTime < start.getTime()) return false;
    if (end && tradeTime > end.getTime()) return false;

    // Account filter ('all' includes all accounts; specific id filters to that account)
    if (filters.accountId && filters.accountId !== 'all') {
      const accId = trade.account_id ? String(trade.account_id) : 'default';
      if (accId !== String(filters.accountId)) return false;
    }

    // Timeframe filter ('all' includes all; specific timeframe filters to that timeframe)
    if (filters.timeframe && filters.timeframe !== 'all') {
      if ((trade.timeframe || '') !== filters.timeframe) return false;
    }

    // Search query filter (symbol or notes)
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSymbol = trade.symbol ? trade.symbol.toLowerCase().includes(q) : false;
        const matchesNotes = trade.notes ? trade.notes.toLowerCase().includes(q) : false;
        if (!matchesSymbol && !matchesNotes) return false;
      }
    }

    return true;
  });
}

/**
 * 4. Trade Sorter
 */
export function sortTrades(trades: EnrichedTrade[], sortBy: SortOption): EnrichedTrade[] {
  const list = [...trades];
  switch (sortBy) {
    case 'date_desc':
      return list.sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
    case 'date_asc':
      return list.sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    case 'pnl_r_desc':
      return list.sort((a, b) => b.pnl_r - a.pnl_r);
    case 'pnl_r_asc':
      return list.sort((a, b) => a.pnl_r - b.pnl_r);
    case 'pnl_amt_desc':
      return list.sort((a, b) => (b.pnl_amount ?? -Infinity) - (a.pnl_amount ?? -Infinity));
    case 'pnl_amt_asc':
      return list.sort((a, b) => (a.pnl_amount ?? Infinity) - (b.pnl_amount ?? Infinity));
    case 'symbol_asc':
      return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    case 'symbol_desc':
      return list.sort((a, b) => b.symbol.localeCompare(a.symbol));
    default:
      return list;
  }
}

/**
 * 5. Comprehensive Performance Metrics Calculator
 */
export function calculateStatistics(
  filteredTrades: EnrichedTrade[],
  playbooksMap: Record<string, string>,
  mistakesMap: Record<string, string>,
  startingAccountsBalance: number = 0
): StatsSummary {
  const total = filteredTrades.length;

  if (total === 0) {
    const hasMoney = startingAccountsBalance > 0;
    return {
      hasMonetaryStats: hasMoney,
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      beCount: 0,
      winRate: 0,
      lossRate: 0,
      beRate: 0,
      netR: 0,
      grossWinR: 0,
      grossLossR: 0,
      profitFactorR: 0,
      expectancyR: 0,
      avgWinR: 0,
      avgLossR: 0,
      winLossRatioR: 0,
      maxDrawdownR: 0,
      netAmount: hasMoney ? 0 : null,
      grossWinAmount: hasMoney ? 0 : null,
      grossLossAmount: hasMoney ? 0 : null,
      profitFactorAmount: hasMoney ? 0 : null,
      expectancyAmount: hasMoney ? 0 : null,
      avgWinAmount: hasMoney ? 0 : null,
      avgLossAmount: hasMoney ? 0 : null,
      maxDrawdownAmount: hasMoney ? 0 : null,
      maxDrawdownPercent: hasMoney ? 0 : null,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      equityCurve: hasMoney ? [{
        tradeId: 'initial',
        date: new Date().toISOString(),
        symbol: 'Start',
        direction: 'LONG',
        outcome: 'BE',
        pnlR: 0,
        pnlAmount: 0,
        cumulativeR: 0,
        cumulativeAmount: 0,
        totalBalance: startingAccountsBalance,
      }] : [],
      dailyPnl: [],
      bySession: [],
      byTimeframe: [],
      byDirection: [],
      bySetup: [],
      byMistake: [],
    };
  }

  // Can calculate monetary stats if trades have monetary pnl_amount or starting balance > 0
  const hasMonetaryStats = filteredTrades.some((t) => t.pnl_amount !== null && t.pnl_amount !== undefined) || startingAccountsBalance > 0;

  // Trades ordered chronologically for equity curve and drawdown
  const chronologicalTrades = [...filteredTrades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  let winCount = 0;
  let lossCount = 0;
  let beCount = 0;

  let netR = 0;
  let grossWinR = 0;
  let grossLossR = 0;

  let netAmount = 0;
  let grossWinAmount = 0;
  let grossLossAmount = 0;

  let maxConsecutiveWins = 0;
  let currentConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentConsecutiveLosses = 0;

  let peakR = 0;
  let maxDrawdownR = 0;

  let cumulativeR = 0;
  let cumulativeAmount = 0;
  let rollingBalance = hasMonetaryStats ? startingAccountsBalance : 0;
  let peakBalance = rollingBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  const equityCurve: EquityPoint[] = [];
  const dailyMap = new Map<string, DailyPnlItem>();

  chronologicalTrades.forEach((t) => {
    const isWin = t.outcome === 'TP';
    const isLoss = t.outcome === 'SL';

    if (isWin) {
      winCount++;
      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      if (currentConsecutiveWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecutiveWins;
    } else if (isLoss) {
      lossCount++;
      currentConsecutiveLosses++;
      currentConsecutiveWins = 0;
      if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses;
    } else {
      beCount++;
      currentConsecutiveWins = 0;
      currentConsecutiveLosses = 0;
    }

    // R metrics
    const r = t.pnl_r;
    netR += r;
    if (r > 0) grossWinR += r;
    if (r < 0) grossLossR += Math.abs(r);

    // Cumulative R and R Drawdown
    cumulativeR += r;
    if (cumulativeR > peakR) {
      peakR = cumulativeR;
    }
    const currentDdR = peakR - cumulativeR;
    if (currentDdR > maxDrawdownR) {
      maxDrawdownR = currentDdR;
    }

    // Monetary metrics (only if hasMonetaryStats)
    const amt = t.pnl_amount ?? 0;
    if (hasMonetaryStats) {
      netAmount += amt;
      if (amt > 0) grossWinAmount += amt;
      if (amt < 0) grossLossAmount += Math.abs(amt);

      cumulativeAmount += amt;
      rollingBalance += amt;

      if (rollingBalance > peakBalance) {
        peakBalance = rollingBalance;
      }
      const currentDdAmt = peakBalance - rollingBalance;
      if (currentDdAmt > maxDrawdownAmount) {
        maxDrawdownAmount = currentDdAmt;
      }
      const currentDdPct = peakBalance > 0 ? (currentDdAmt / peakBalance) * 100 : 0;
      if (currentDdPct > maxDrawdownPercent) {
        maxDrawdownPercent = currentDdPct;
      }
    }

    equityCurve.push({
      tradeId: t.id,
      date: t.trade_date,
      symbol: t.symbol,
      direction: t.direction,
      outcome: t.outcome,
      pnlR: Number(r.toFixed(2)),
      pnlAmount: t.pnl_amount !== null && t.pnl_amount !== undefined ? Number(t.pnl_amount.toFixed(2)) : null,
      cumulativeR: Number(cumulativeR.toFixed(2)),
      cumulativeAmount: hasMonetaryStats ? Number(cumulativeAmount.toFixed(2)) : null,
      totalBalance: hasMonetaryStats ? Number(rollingBalance.toFixed(2)) : null,
      accountName: t.account_name,
    });

    // Daily grouping
    const dayKey = t.trade_date.substring(0, 10);
    const existingDay = dailyMap.get(dayKey) || {
      date: dayKey,
      tradesCount: 0,
      netR: 0,
      netAmount: hasMonetaryStats ? 0 : null,
      winCount: 0,
      lossCount: 0,
    };
    existingDay.tradesCount++;
    existingDay.netR += r;
    if (amt !== null && amt !== undefined) {
      existingDay.netAmount = (existingDay.netAmount ?? 0) + amt;
    }
    if (isWin) existingDay.winCount++;
    if (isLoss) existingDay.lossCount++;
    dailyMap.set(dayKey, existingDay);
  });

  const winRate = Number(((winCount / total) * 100).toFixed(1));
  const lossRate = Number(((lossCount / total) * 100).toFixed(1));
  const beRate = Number(((beCount / total) * 100).toFixed(1));

  const profitFactorR = grossLossR === 0 ? Number(grossWinR.toFixed(2)) : Number((grossWinR / grossLossR).toFixed(2));
  const expectancyR = Number((netR / total).toFixed(2));
  const avgWinR = winCount > 0 ? Number((grossWinR / winCount).toFixed(2)) : 0;
  const avgLossR = lossCount > 0 ? Number((grossLossR / lossCount).toFixed(2)) : 0;
  const winLossRatioR = avgLossR > 0 ? Number((avgWinR / avgLossR).toFixed(2)) : avgWinR;

  let profitFactorAmount: number | null = null;
  let expectancyAmount: number | null = null;
  let avgWinAmount: number | null = null;
  let avgLossAmount: number | null = null;

  if (hasMonetaryStats) {
    profitFactorAmount = grossLossAmount === 0 ? Number(grossWinAmount.toFixed(2)) : Number((grossWinAmount / grossLossAmount).toFixed(2));
    expectancyAmount = Number((netAmount / total).toFixed(2));
    avgWinAmount = winCount > 0 ? Number((grossWinAmount / winCount).toFixed(2)) : 0;
    avgLossAmount = lossCount > 0 ? Number((grossLossAmount / lossCount).toFixed(2)) : 0;
  }

  // Breakdown generators
  const buildBreakdowns = (
    extractor: (t: EnrichedTrade) => { key: string; label: string }[]
  ): BreakdownMetric[] => {
    const map = new Map<string, { label: string; trades: EnrichedTrade[] }>();

    filteredTrades.forEach((t) => {
      const items = extractor(t);
      items.forEach(({ key, label }) => {
        const entry = map.get(key) || { label, trades: [] };
        entry.trades.push(t);
        map.set(key, entry);
      });
    });

    const result: BreakdownMetric[] = [];
    map.forEach((val, key) => {
      const count = val.trades.length;
      const wins = val.trades.filter((t) => t.outcome === 'TP').length;
      const losses = val.trades.filter((t) => t.outcome === 'SL').length;
      const bes = val.trades.filter((t) => t.outcome === 'BE').length;
      const nR = val.trades.reduce((acc, t) => acc + t.pnl_r, 0);
      const tradesWithAmt = val.trades.filter((t) => t.pnl_amount !== null && t.pnl_amount !== undefined);
      const nAmt = hasMonetaryStats && tradesWithAmt.length > 0
        ? tradesWithAmt.reduce((acc, t) => acc + (t.pnl_amount ?? 0), 0)
        : null;
      const gWinR = val.trades.filter((t) => t.pnl_r > 0).reduce((acc, t) => acc + t.pnl_r, 0);
      const gLossR = Math.abs(val.trades.filter((t) => t.pnl_r < 0).reduce((acc, t) => acc + t.pnl_r, 0));
      const pf = gLossR === 0 ? Number(gWinR.toFixed(2)) : Number((gWinR / gLossR).toFixed(2));

      result.push({
        key,
        label: val.label,
        tradesCount: count,
        winCount: wins,
        lossCount: losses,
        beCount: bes,
        winRate: count > 0 ? Math.round((wins / count) * 100) : 0,
        netR: Number(nR.toFixed(2)),
        netAmount: nAmt !== null ? Number(nAmt.toFixed(2)) : null,
        profitFactor: pf,
      });
    });

    return result.sort((a, b) => b.netR - a.netR);
  };

  const bySession = buildBreakdowns((t) => [
    {
      key: t.session,
      label: t.session === 'LONDON' ? 'London' :
             t.session === 'NEW_YORK' ? 'New York' :
             t.session === 'ASIA' ? 'Asia' : 'Off-Session',
    },
  ]);

  const byTimeframe = buildBreakdowns((t) => [
    {
      key: t.timeframe || 'none',
      label: t.timeframe ? t.timeframe : 'No Timeframe',
    },
  ]);

  const byDirection = buildBreakdowns((t) => [
    {
      key: t.direction,
      label: t.direction === 'LONG' ? 'Long' : 'Short',
    },
  ]);

  const bySetup = buildBreakdowns((t) => {
    if (!t.setup_id) return [{ key: 'none', label: 'No Setup' }];
    return [{ key: t.setup_id, label: playbooksMap[t.setup_id] || 'Unknown Setup' }];
  });

  const byMistake = buildBreakdowns((t) => {
    if (!t.mistake_ids || t.mistake_ids.length === 0) {
      return [{ key: 'clean', label: 'Clean (No Mistake)' }];
    }
    return t.mistake_ids.map((id) => ({
      key: id,
      label: mistakesMap[id] || 'Unknown Mistake',
    }));
  });

  const dailyPnl = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    hasMonetaryStats,
    totalTrades: total,
    winCount,
    lossCount,
    beCount,
    winRate,
    lossRate,
    beRate,
    netR: Number(netR.toFixed(2)),
    grossWinR: Number(grossWinR.toFixed(2)),
    grossLossR: Number(grossLossR.toFixed(2)),
    profitFactorR,
    expectancyR,
    avgWinR,
    avgLossR,
    winLossRatioR,
    maxDrawdownR: Number(maxDrawdownR.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
    grossWinAmount: Number(grossWinAmount.toFixed(2)),
    grossLossAmount: Number(grossLossAmount.toFixed(2)),
    profitFactorAmount,
    expectancyAmount,
    avgWinAmount,
    avgLossAmount,
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(1)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    equityCurve,
    dailyPnl,
    bySession,
    byTimeframe,
    byDirection,
    bySetup,
    byMistake,
  };
}

