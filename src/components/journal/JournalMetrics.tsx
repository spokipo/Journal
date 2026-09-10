import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MetricsSkeleton } from './JournalSkeletons';
import type { ActiveTab, TradeStats, OutcomeCounts, IdeaStats } from './types';

interface JournalMetricsProps {
  isLoading: boolean;
  activeTab: ActiveTab;
  stats: TradeStats;
  outcomeCounts: OutcomeCounts;
  ideaStats: IdeaStats;
  showOutcomeBreakdown: boolean;
  onToggleOutcomeBreakdown: () => void;
}

export function JournalMetrics({
  isLoading,
  activeTab,
  stats,
  outcomeCounts,
  ideaStats,
  showOutcomeBreakdown,
  onToggleOutcomeBreakdown,
}: JournalMetricsProps) {
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="metrics-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MetricsSkeleton />
          </motion.div>
        ) : activeTab === 'trades' ? (
          <motion.div
            key="trades-metrics"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
          >
            <button
              type="button"
              onClick={onToggleOutcomeBreakdown}
              className={cn(
                "flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border rounded-[26px] text-left transition-all cursor-pointer select-none group active:scale-[0.98]",
                showOutcomeBreakdown
                  ? "border-blue-500/60 bg-blue-500/[0.04] shadow-xs"
                  : "border-border-card hover:border-blue-500/30 hover:bg-canvas/40"
              )}
              title="Нажмите для переключения: общая статистика / подсчет TP, BE, SL"
            >
              <div className="flex items-center gap-1.5 min-w-0 mr-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-main truncate transition-colors">
                  Trades
                </span>
                <ChevronsUpDown
                  size={12}
                  className={cn(
                    "transition-transform duration-200 shrink-0",
                    showOutcomeBreakdown ? "text-blue-500 rotate-180" : "text-text-muted/40 group-hover:text-text-muted"
                  )}
                />
              </div>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-text-main shrink-0">
                {stats.total}
              </div>
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {!showOutcomeBreakdown ? (
                <React.Fragment key="standard-metrics">
                  <motion.div
                    key="metric-winrate"
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Win Rate</span>
                    <div className={cn("text-base sm:text-xl font-bold font-mono tabular-nums", stats.winRate >= 50 ? "text-emerald-500" : "text-rose-500")}>
                      {stats.winRate}%
                    </div>
                  </motion.div>

                  <motion.div
                    key="metric-netpnl"
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Net PnL</span>
                    <div className={cn("text-base sm:text-xl font-bold font-mono tabular-nums", stats.netR >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {stats.netR > 0 ? `+${stats.netR} R` : `${stats.netR} R`}
                    </div>
                  </motion.div>

                  <motion.div
                    key="metric-netpercent"
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">PnL %</span>
                    <div className={cn(
                      "text-base sm:text-xl font-bold font-mono tabular-nums",
                      stats.netPercent >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {stats.netPercent > 0 ? `+${stats.netPercent}%` : `${stats.netPercent}%`}
                    </div>
                  </motion.div>
                </React.Fragment>
              ) : (
                <React.Fragment key="outcome-metrics">
                  <motion.div
                    key="metric-tp"
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Take Profit</span>
                    <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-500">
                      {outcomeCounts.tp}
                    </div>
                  </motion.div>

                  <motion.div
                    key="metric-be"
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Breakeven</span>
                    <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-amber-500">
                      {outcomeCounts.be}
                    </div>
                  </motion.div>

                  <motion.div
                    key="metric-sl"
                    initial={{ opacity: 0, scale: 0.96, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]"
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Stop Loss</span>
                    <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-rose-500">
                      {outcomeCounts.sl}
                    </div>
                  </motion.div>
                </React.Fragment>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="ideas-metrics"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
          >
            <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Total</span>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-text-main">{ideaStats.total}</div>
            </div>
            <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Active</span>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-amber-500">{ideaStats.active}</div>
            </div>
            <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Executed</span>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-emerald-500">{ideaStats.executed}</div>
            </div>
            <div className="flex flex-row items-baseline justify-between p-3.5 sm:p-4 bg-card border border-border-card rounded-[26px]">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted truncate mr-2">Invalidated</span>
              <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-rose-500">{ideaStats.invalidated}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

