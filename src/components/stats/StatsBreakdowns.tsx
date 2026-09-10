import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Compass, 
  BookMarked, 
  AlertTriangle, 
  Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select, type SelectOption } from '../ui/Select';
import type { StatsSummary, BreakdownMetric, DailyPnlItem } from '../../lib/statsEngine';

interface StatsBreakdownsProps {
  stats: StatsSummary;
  metricMode: 'dual' | 'r' | 'amount';
}

type TabType = 'session' | 'setup' | 'mistake' | 'direction' | 'daily';

const TABS: { id: TabType; value: TabType; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'session', value: 'session', label: 'By Session', icon: Clock },
  { id: 'setup', value: 'setup', label: 'By Setup', icon: BookMarked },
  { id: 'direction', value: 'direction', label: 'By Direction', icon: Compass },
  { id: 'mistake', value: 'mistake', label: 'Mistakes Cost', icon: AlertTriangle },
  { id: 'daily', value: 'daily', label: 'Daily Performance', icon: Calendar },
];

export function StatsBreakdowns({
  stats,
  metricMode,
}: StatsBreakdownsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('session');

  const renderBreakdownTable = (items: BreakdownMetric[]) => {
    if (items.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-text-muted">
          No data available for this category
        </div>
      );
    }

    return (
      <div>
        {/* Mobile Card View (< md) per design.md §9 (no horizontal scroll) */}
        <div className="space-y-2.5 md:hidden">
          {items.map((item) => {
            const isNetPositive = item.netR > 0;
            const isNetNegative = item.netR < 0;

            return (
              <div
                key={item.key}
                className="p-3.5 rounded-[18px] bg-canvas/40 border border-border-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-main text-xs">{item.label}</span>
                  <span className="font-mono tabular-nums text-xs text-text-muted">
                    {item.tradesCount} <span className="text-[0.6875rem]">({item.winCount}W / {item.lossCount}L)</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-card/60 text-xs">
                  <div>
                    <span className="text-[0.6875rem] text-text-muted block">Win Rate</span>
                    <span className={cn("font-mono font-semibold", item.winRate >= 50 ? "text-emerald-500" : "text-text-main")}>
                      {item.winRate}%
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[0.6875rem] text-text-muted block">Net Result</span>
                    <span
                      className={cn(
                        "font-mono font-bold block",
                        isNetPositive ? "text-emerald-500" : isNetNegative ? "text-rose-500" : "text-text-main"
                      )}
                    >
                      {item.netR > 0 ? `+${item.netR.toFixed(2)}` : item.netR.toFixed(2)} R
                    </span>
                    <span className="text-[0.6875rem] font-mono text-text-muted block">
                      {item.netAmount >= 0 ? '+' : ''}${item.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[0.6875rem] text-text-muted block">Profit Factor</span>
                    <span className="font-mono font-semibold text-text-main">
                      {item.profitFactor > 0 ? item.profitFactor.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-card text-[0.6875rem] uppercase font-semibold text-text-muted">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Trades</th>
                <th className="py-2.5 px-3 text-center">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Net R</th>
                <th className="py-2.5 px-3 text-right">Net ($)</th>
                <th className="py-2.5 px-3 text-right">Profit Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-card text-xs">
              {items.map((item) => {
                const isNetPositive = item.netR > 0;
                const isNetNegative = item.netR < 0;

                return (
                  <tr
                    key={item.key}
                    className="hover:bg-canvas/60 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-text-main">
                      {item.label}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-text-muted">
                      {item.tradesCount} <span className="text-[0.6875rem]">({item.winCount}W / {item.lossCount}L)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={item.winRate >= 50 ? "text-emerald-500 font-semibold" : "text-text-main"}>
                          {item.winRate}%
                        </span>
                        <div className="w-12 bg-canvas rounded-full h-1 overflow-hidden hidden sm:block">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${item.winRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 text-right font-mono tabular-nums font-semibold",
                        isNetPositive ? "text-emerald-500" : isNetNegative ? "text-rose-500" : "text-text-main"
                      )}
                    >
                      {item.netR > 0 ? `+${item.netR.toFixed(2)}` : item.netR.toFixed(2)} R
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 text-right font-mono tabular-nums font-semibold",
                        item.netAmount > 0 ? "text-emerald-500" : item.netAmount < 0 ? "text-rose-500" : "text-text-main"
                      )}
                    >
                      {item.netAmount >= 0 ? '+' : ''}${item.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-text-main">
                      {item.profitFactor > 0 ? item.profitFactor.toFixed(2) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDailyBars = (items: DailyPnlItem[]) => {
    if (items.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-text-muted">
          No daily records in this period
        </div>
      );
    }

    const maxAbsR = Math.max(1, ...items.map((i) => Math.abs(i.netR)));

    return (
      <div className="space-y-2">
        <div className="text-[0.6875rem] text-text-muted font-mono flex items-center justify-between pb-2 border-b border-border-card">
          <span>Date</span>
          <span className="hidden sm:inline">Trades</span>
          <span>Daily Result (R & $)</span>
        </div>

        <div className="space-y-1.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
          {items.slice(-30).reverse().map((day) => {
            const isPos = day.netR > 0;
            const isNeg = day.netR < 0;
            const barWidth = Math.min(100, Math.round((Math.abs(day.netR) / maxAbsR) * 100));

            return (
              <div
                key={day.date}
                className="flex items-center justify-between p-2.5 rounded-[14px] bg-canvas/40 hover:bg-canvas text-xs transition-colors gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                  <span className="font-mono font-medium text-text-main">{day.date}</span>
                  <span className="text-text-muted font-mono text-[0.6875rem]">
                    {day.tradesCount}t ({day.winCount}W/{day.lossCount}L)
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 justify-end">
                  <div className="w-16 sm:w-24 bg-card h-1.5 rounded-full overflow-hidden flex justify-end">
                    <div
                      className={cn("h-full rounded-full transition-all", isPos ? "bg-emerald-500" : isNeg ? "bg-rose-500" : "bg-text-muted")}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="text-right font-mono tabular-nums min-w-[70px]">
                    <span className={cn("font-semibold block", isPos ? "text-emerald-500" : isNeg ? "text-rose-500" : "text-text-muted")}>
                      {isPos ? `+${day.netR.toFixed(2)}` : day.netR.toFixed(2)}R
                    </span>
                    <span className="text-[0.625rem] text-text-muted block">
                      {day.netAmount >= 0 ? '+' : ''}${day.netAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border-card rounded-[26px] p-5 shadow-sm space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-card">
        <div>
          <h3 className="text-sm font-semibold text-text-main">Performance Breakdown</h3>
          <p className="text-[0.6875rem] text-text-muted mt-0.5">
            Identify edges, best sessions, and costly recurring errors
          </p>
        </div>

        {/* Mobile Tab Control: Select dropdown (< sm) per design.md §9 */}
        <div className="block sm:hidden w-full">
          <Select
            value={activeTab}
            options={TABS}
            onChange={(val) => setActiveTab(val as TabType)}
            className="w-full min-h-11"
          />
        </div>

        {/* Desktop Tab Controls: Segmented Control (>= sm) */}
        <div className="hidden sm:flex items-center gap-1 bg-canvas border border-border-card rounded-[16px] p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative h-8 px-2.5 text-xs font-medium rounded-[12px] transition-colors whitespace-nowrap select-none cursor-pointer flex items-center gap-1.5",
                  isActive ? "text-blue-500 font-semibold" : "text-text-muted hover:text-text-main"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="stats-breakdown-tab-pill"
                    className="absolute inset-0 bg-card rounded-[12px] shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'session' && renderBreakdownTable(stats.bySession)}
        {activeTab === 'setup' && renderBreakdownTable(stats.bySetup)}
        {activeTab === 'direction' && renderBreakdownTable(stats.byDirection)}
        {activeTab === 'mistake' && renderBreakdownTable(stats.byMistake)}
        {activeTab === 'daily' && renderDailyBars(stats.dailyPnl)}
      </div>
    </div>
  );
}

