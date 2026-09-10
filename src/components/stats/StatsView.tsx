import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, 
  RotateCcw, 
  AlertCircle, 
  TrendingUp, 
  Wallet,
  BookOpen,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { 
  enrichTradesWithHistoricalData, 
  filterTrades, 
  sortTrades, 
  calculateStatistics,
  type RawTrade, 
  type TradingAccount, 
  type EnrichedTrade, 
  type FilterState,
  type StatsSummary,
} from '../../lib/statsEngine';
import { StatsToolbar } from './StatsToolbar';
import { StatsMetricsGrid } from './StatsMetricsGrid';
import { StatsEquityChart } from './StatsEquityChart';
import { StatsBreakdowns } from './StatsBreakdowns';
import { StatsTradesTable } from './StatsTradesTable';
import { TradeModal } from '../trade/TradeModal';

const INITIAL_FILTERS: FilterState = {
  period: 'all',
  customStartDate: undefined,
  customEndDate: undefined,
  accountId: 'all',
  searchQuery: '',
};

export function StatsView() {
  const [user, setUser] = useState<any>(null);
  const [rawTrades, setRawTrades] = useState<RawTrade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbooks, setPlaybooks] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Metric Mode State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [metricMode, setMetricMode] = useState<'dual' | 'r' | 'amount'>('dual');

  // Trade Modal State for inspecting/editing trades
  const [selectedTrade, setSelectedTrade] = useState<RawTrade | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  // Fetch all trades, accounts, setups, and mistakes
  const fetchData = useCallback(async (userId?: string) => {
    setIsLoading(true);
    setError(null);

    let loadedAccounts: TradingAccount[] = [];
    let loadedTrades: RawTrade[] = [];
    const pbMap: Record<string, string> = {};
    const mistMap: Record<string, string> = {};

    try {
      if (userId && isSupabaseConfigured) {
        const [pbRes, mistRes, trRes, accRes] = await Promise.all([
          supabase
            .from('playbooks')
            .select('id, title')
            .eq('user_id', userId),
          supabase
            .from('user_mistakes')
            .select('id, name')
            .eq('user_id', userId),
          supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .order('trade_date', { ascending: true }),
          supabase
            .from('trading_accounts')
            .select('*')
            .eq('user_id', userId)
            .or('is_archived.is.null,is_archived.eq.false')
            .order('is_default', { ascending: false }),
        ]);

        if (pbRes.data) pbRes.data.forEach((p) => { pbMap[p.id] = p.title; });
        if (mistRes.data) mistRes.data.forEach((m) => { mistMap[m.id] = m.name; });
        if (trRes.data) loadedTrades = trRes.data;
        if (accRes.data) loadedAccounts = accRes.data;
      }

      // Offline localStorage fallback (matches Dashboard.tsx)
      if (loadedAccounts.length === 0) {
        const cached = localStorage.getItem('trading_accounts_offline');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) loadedAccounts = parsed.filter((a: any) => !a.is_archived);
          } catch (e) {}
        }
      }

      if (loadedTrades.length === 0) {
        const cachedTrades = localStorage.getItem('trades_offline');
        if (cachedTrades) {
          try {
            const parsed = JSON.parse(cachedTrades);
            if (Array.isArray(parsed)) loadedTrades = parsed;
          } catch (e) {}
        }
      }

      setPlaybooks(pbMap);
      setMistakes(mistMap);
      setRawTrades(loadedTrades);
      setAccounts(loadedAccounts);
    } catch (err: any) {
      console.error('Error loading stats data:', err);
      const cached = localStorage.getItem('trading_accounts_offline');
      let fallbackAccs: TradingAccount[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) fallbackAccs = parsed.filter((a: any) => !a.is_archived);
        } catch (e) {}
      }
      setAccounts(fallbackAccs);

      const cachedTrades = localStorage.getItem('trades_offline');
      let fallbackTrades: RawTrade[] = [];
      if (cachedTrades) {
        try {
          const parsed = JSON.parse(cachedTrades);
          if (Array.isArray(parsed)) fallbackTrades = parsed;
        } catch (e) {}
      }
      setRawTrades(fallbackTrades);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      fetchData();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchData(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchData(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // 1. Enriched Trades: accurately tracking account balance chronologically
  const enrichedTrades = useMemo(() => {
    return enrichTradesWithHistoricalData(rawTrades, accounts);
  }, [rawTrades, accounts]);

  // Total starting balance: for selected account or sum of all accounts if 'all'
  const startingBalance = useMemo(() => {
    if (filters.accountId && filters.accountId !== 'all') {
      const acc = accounts.find((a) => String(a.id) === String(filters.accountId));
      if (!acc) return 0;
      const init = Number(acc.initial_balance ?? acc.balance ?? 0);
      return isNaN(init) || init <= 0 ? 0 : init;
    }
    return accounts.reduce((sum, acc) => {
      const init = Number(acc.initial_balance ?? acc.balance ?? 0);
      return sum + (isNaN(init) || init <= 0 ? 0 : init);
    }, 0);
  }, [accounts, filters.accountId]);

  // 2. Filter Application
  const filteredTrades = useMemo(() => {
    return filterTrades(enrichedTrades, filters);
  }, [enrichedTrades, filters]);

  // 3. Dynamic Statistics Calculation
  const stats = useMemo(() => {
    return calculateStatistics(filteredTrades, playbooks, mistakes, startingBalance);
  }, [filteredTrades, playbooks, mistakes, startingBalance]);

  // 4. Sorted Trades for display in the table
  const sortedTrades = useMemo(() => {
    return sortTrades(filteredTrades, sortBy);
  }, [filteredTrades, sortBy]);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSortBy('date_desc');
  };

  const handleSelectTrade = (trade: EnrichedTrade) => {
    setSelectedTrade(trade);
    setIsTradeModalOpen(true);
  };

  const handleTradeModalSuccess = () => {
    if (user) fetchData(user.id);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!isSupabaseConfigured || !user) return;
    try {
      const { error } = await supabase.from('trades').delete().eq('id', tradeId).eq('user_id', user.id);
      if (!error) fetchData(user.id);
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  // =========================================================================
  // RENDER: Loading State (§7: Skeleton matching real geometry)
  // =========================================================================
  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-64 bg-canvas rounded-[14px] animate-pulse mb-2" />
          <div className="h-4 w-48 bg-canvas rounded-[10px] animate-pulse" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="h-11 w-full bg-canvas rounded-[18px] animate-pulse" />

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-canvas rounded-[26px] animate-pulse"
            />
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="h-72 bg-canvas rounded-[26px] animate-pulse" />

        {/* Breakdown Skeleton */}
        <div className="h-64 bg-canvas rounded-[26px] animate-pulse" />
      </div>
    );
  }

  // =========================================================================
  // RENDER: Error State (§7)
  // =========================================================================
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-card border border-border-card rounded-[26px] p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-main">Couldn't load statistics</h2>
            <p className="text-xs text-text-muted mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => user && fetchData(user.id)}
            className="h-10 px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-main hover:bg-canvas active:scale-[0.98] transition-all inline-flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Main Content
  // =========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">
            Analytics & Statistics
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Dynamic performance metrics, monetary results, and edge distribution
          </p>
        </div>
      </div>

      {/* Toolbar with Period, Custom Date, Account Selector, and Unit Selector */}
      <StatsToolbar
        filters={filters}
        accounts={accounts}
        metricMode={metricMode}
        onMetricModeChange={setMetricMode}
        onFilterChange={setFilters}
        onResetFilters={handleResetFilters}
      />

      {/* If user has zero trades in database */}
      {rawTrades.length === 0 ? (
        <div className="bg-card border border-border-card rounded-[26px] p-10 text-center space-y-4 shadow-sm my-6">
          <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto text-text-muted">
            <BarChart2 size={26} />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="text-sm font-semibold text-text-main">No trades recorded yet</h3>
            <p className="text-xs text-text-muted mt-1">
              Start journaling trades in the Journal section to generate performance statistics and equity curves.
            </p>
          </div>
          <a
            href="/journal"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20"
          >
            <BookOpen size={14} />
            Go to Journal
          </a>
        </div>
      ) : (
        <>
          {/* KPI Metrics Grid */}
          <StatsMetricsGrid
            stats={stats}
            metricMode={metricMode}
          />

          {/* Equity Curve SVG Chart (§8 compliant) */}
          <StatsEquityChart
            equityCurve={stats.equityCurve}
            initialBalance={startingBalance}
            metricMode={metricMode}
          />

          {/* Performance Breakdown by Session, Setup, Mistake, Direction, Daily */}
          <StatsBreakdowns
            stats={stats}
            metricMode={metricMode}
          />

          {/* Detailed Trades Table with sorting and TradeModal trigger */}
          <StatsTradesTable
            trades={sortedTrades}
            playbooks={playbooks}
            mistakes={mistakes}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onSelectTrade={handleSelectTrade}
          />
        </>
      )}

      {/* Trade Modal for inspection / edits */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        user={user}
        editingTrade={selectedTrade}
        onSuccess={handleTradeModalSuccess}
        onDelete={handleDeleteTrade}
      />
    </div>
  );
}

