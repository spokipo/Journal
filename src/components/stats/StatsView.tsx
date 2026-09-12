import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, 
  RotateCcw, 
  AlertCircle, 
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
import { StatsToolbar, type SortOption } from './StatsToolbar';
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
  timeframe: 'all',
  searchQuery: '',
};

// =========================================================================
// SKELETON COMPONENT (§7 Loading State)
// =========================================================================
function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-card border border-border-card rounded-[26px] p-4 flex flex-col justify-between"
          >
            <div className="h-3.5 w-20 bg-canvas rounded-[14px]" />
            <div className="h-6 w-24 bg-canvas rounded-[14px]" />
          </div>
        ))}
      </div>

      {/* Equity Chart Skeleton */}
      <div className="h-80 bg-card border border-border-card rounded-[26px] p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-canvas rounded-[14px]" />
          <div className="h-4 w-20 bg-canvas rounded-[14px]" />
        </div>
        <div className="flex-1 w-full bg-canvas/60 rounded-[18px] my-4" />
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-canvas rounded-[14px]" />
          <div className="h-3 w-16 bg-canvas rounded-[14px]" />
        </div>
      </div>

      {/* Breakdowns Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 bg-card border border-border-card rounded-[26px] p-5 space-y-4">
          <div className="h-4 w-36 bg-canvas rounded-[14px]" />
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-10 bg-canvas/70 rounded-[14px]" />
            ))}
          </div>
        </div>
        <div className="h-64 bg-card border border-border-card rounded-[26px] p-5 space-y-4">
          <div className="h-4 w-36 bg-canvas rounded-[14px]" />
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-10 bg-canvas/70 rounded-[14px]" />
            ))}
          </div>
        </div>
      </div>

      {/* Trades Table Skeleton */}
      <div className="h-64 bg-card border border-border-card rounded-[26px] p-5 space-y-3">
        <div className="h-4 w-40 bg-canvas rounded-[14px]" />
        <div className="space-y-2 pt-2">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-11 bg-canvas/60 rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // Trade Modal State
  const [selectedTrade, setSelectedTrade] = useState<RawTrade | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

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

  const enrichedTrades = useMemo(() => {
    return enrichTradesWithHistoricalData(rawTrades, accounts);
  }, [rawTrades, accounts]);

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

  const filteredTrades = useMemo(() => {
    return filterTrades(enrichedTrades, filters);
  }, [enrichedTrades, filters]);

  const stats = useMemo(() => {
    return calculateStatistics(filteredTrades, playbooks, mistakes, startingBalance);
  }, [filteredTrades, playbooks, mistakes, startingBalance]);

  const sortedTrades = useMemo(() => {
    return sortTrades(filteredTrades, sortBy);
  }, [filteredTrades, sortBy]);

  const availableTimeframes = useMemo(() => {
    const set = new Set<string>();
    rawTrades.forEach((t) => {
      if (t.timeframe) set.add(t.timeframe);
    });
    return Array.from(set).sort();
  }, [rawTrades]);

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

  return (
    <div className="space-y-6 pb-12 w-full max-w-[1280px] mx-auto">
      {/* 1. Page Header (§3 Page header) */}
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

      {/* 2. Toolbar (§3 Toolbar) */}
      <StatsToolbar
        filters={filters}
        accounts={accounts}
        availableTimeframes={availableTimeframes}
        metricMode={metricMode}
        onMetricModeChange={setMetricMode}
        onFilterChange={setFilters}
        onResetFilters={handleResetFilters}
      />

      {/* 3. Content Area: Skeleton -> Error -> Empty -> Content (§7) */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="stats-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <StatsSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="stats-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-[50vh] flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border-card rounded-[26px] p-8 max-w-md w-full text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-main">Couldn't load statistics</h2>
                <p className="text-xs text-text-muted mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => user && fetchData(user.id)}
                className="h-10 px-5 rounded-full bg-canvas border border-border-card text-xs font-semibold text-text-main hover:bg-card active:scale-[0.98] shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <RotateCcw size={14} />
                <span>Retry</span>
              </button>
            </div>
          </motion.div>
        ) : rawTrades.length === 0 ? (
          <motion.div
            key="stats-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card border border-border-card rounded-[26px] p-10 text-center space-y-4 shadow-sm my-6"
          >
            <div className="w-14 h-14 rounded-full bg-canvas border border-border-card flex items-center justify-center mx-auto text-text-muted">
              <BarChart2 size={24} />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="text-sm font-semibold text-text-main">No trades recorded yet</h3>
              <p className="text-xs text-text-muted mt-1">
                Start journaling trades in the Journal section to generate performance statistics and equity curves.
              </p>
            </div>
            <a
              href="/journal"
              className="inline-flex items-center justify-center gap-2 min-h-11 md:min-h-10 h-11 md:h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <BookOpen size={16} />
              <span>Go to Journal</span>
            </a>
          </motion.div>
        ) : (
          <motion.div
            key="stats-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* KPI Metrics Grid with Band reveal (§3.1) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <StatsMetricsGrid
                stats={stats}
                metricMode={metricMode}
              />
            </motion.div>

            {/* Equity Curve SVG Chart */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <StatsEquityChart
                equityCurve={stats.equityCurve}
                initialBalance={startingBalance}
                metricMode={metricMode}
              />
            </motion.div>

            {/* Performance Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <StatsBreakdowns
                stats={stats}
                metricMode={metricMode}
              />
            </motion.div>

            {/* Detailed Trades Table */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <StatsTradesTable
                trades={sortedTrades}
                playbooks={playbooks}
                mistakes={mistakes}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onSelectTrade={handleSelectTrade}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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