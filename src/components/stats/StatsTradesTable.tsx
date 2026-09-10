import React, { useState } from 'react';
import { 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select, type SelectOption } from '../ui/Select';
import type { EnrichedTrade, SortOption } from '../../lib/statsEngine';

interface StatsTradesTableProps {
  trades: EnrichedTrade[];
  playbooks: Record<string, string>;
  mistakes: Record<string, string>;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSelectTrade: (trade: EnrichedTrade) => void;
}

const ITEMS_PER_PAGE = 15;

const SORT_SELECT_OPTIONS: SelectOption[] = [
  { value: 'date_desc', label: 'Date (Newest)' },
  { value: 'date_asc', label: 'Date (Oldest)' },
  { value: 'pnl_r_desc', label: 'PnL R (Highest)' },
  { value: 'pnl_r_asc', label: 'PnL R (Lowest)' },
  { value: 'pnl_amt_desc', label: 'PnL $ (Highest)' },
  { value: 'pnl_amt_asc', label: 'PnL $ (Lowest)' },
];

export function StatsTradesTable({
  trades,
  playbooks,
  mistakes,
  sortBy,
  onSortChange,
  onSelectTrade,
}: StatsTradesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(trades.length / ITEMS_PER_PAGE) || 1;
  const paginatedTrades = trades.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-card border border-border-card rounded-[26px] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-card">
        <div>
          <h3 className="text-sm font-semibold text-text-main">Filtered Trades List</h3>
          <p className="text-[0.6875rem] text-text-muted mt-0.5">
            Showing {trades.length} {trades.length === 1 ? 'trade' : 'trades'} matching current criteria
          </p>
        </div>

        {/* Mobile Sort: Select with 44px touch target per design.md §9 */}
        <div className="block sm:hidden w-full">
          <Select
            value={sortBy}
            options={SORT_SELECT_OPTIONS}
            onChange={(val) => onSortChange(val as SortOption)}
            className="w-full min-h-11"
          />
        </div>

        {/* Desktop Quick Sorting shortcuts */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted font-medium">
          <span>Sort:</span>
          <button
            type="button"
            onClick={() => onSortChange(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
            className={cn(
              "px-2.5 py-1 rounded-[10px] transition-colors cursor-pointer",
              sortBy.startsWith('date') ? "bg-blue-500/10 text-blue-500 font-semibold" : "hover:bg-canvas"
            )}
          >
            Date {sortBy === 'date_desc' ? '↓' : sortBy === 'date_asc' ? '↑' : ''}
          </button>
          <button
            type="button"
            onClick={() => onSortChange(sortBy === 'pnl_r_desc' ? 'pnl_r_asc' : 'pnl_r_desc')}
            className={cn(
              "px-2.5 py-1 rounded-[10px] transition-colors cursor-pointer",
              sortBy.startsWith('pnl_r') ? "bg-blue-500/10 text-blue-500 font-semibold" : "hover:bg-canvas"
            )}
          >
            PnL (R) {sortBy === 'pnl_r_desc' ? '↓' : sortBy === 'pnl_r_asc' ? '↑' : ''}
          </button>
          <button
            type="button"
            onClick={() => onSortChange(sortBy === 'pnl_amt_desc' ? 'pnl_amt_asc' : 'pnl_amt_desc')}
            className={cn(
              "px-2.5 py-1 rounded-[10px] transition-colors cursor-pointer",
              sortBy.startsWith('pnl_amt') ? "bg-blue-500/10 text-blue-500 font-semibold" : "hover:bg-canvas"
            )}
          >
            PnL ($) {sortBy === 'pnl_amt_desc' ? '↓' : sortBy === 'pnl_amt_asc' ? '↑' : ''}
          </button>
        </div>
      </div>

      {/* Table / List Content */}
      {trades.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          No trades found matching current filter selection.
        </div>
      ) : (
        <div>
          {/* Mobile Card List (< md) per design.md §9 (no horizontal scroll escape hatch) */}
          <div className="space-y-2.5 md:hidden">
            {paginatedTrades.map((t) => {
              const isLong = t.direction === 'LONG';
              const isWin = t.outcome === 'TP';
              const isLoss = t.outcome === 'SL';
              const formattedDate = new Date(t.trade_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrade(t)}
                  className="p-3.5 rounded-[18px] bg-canvas/40 hover:bg-canvas border border-border-card transition-colors cursor-pointer space-y-2.5 active:scale-[0.99]"
                >
                  {/* Top Row: Date, Symbol, Direction, Outcome */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-main text-xs">{t.symbol}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold uppercase",
                          isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}
                      >
                        {t.direction}
                      </span>
                      <span className="font-mono text-text-muted text-[0.6875rem]">
                        {formattedDate}
                      </span>
                    </div>

                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase font-mono",
                        isWin ? "bg-emerald-500/10 text-emerald-500" :
                        isLoss ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                      )}
                    >
                      {t.outcome}
                    </span>
                  </div>

                  {/* Middle Row: Account & Setup */}
                  <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border-card/60">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-main">{t.account_name}</span>
                      {t.setup_id && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[130px]">{playbooks[t.setup_id] || 'Setup'}</span>
                        </>
                      )}
                    </div>
                    <span className="font-mono text-[0.6875rem]">Risk: ${t.risk_amount.toFixed(0)}</span>
                  </div>

                  {/* Bottom Row: Result in R and $ */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[0.6875rem] text-text-muted">Net Result</span>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                      <span
                        className={cn(
                          "font-bold",
                          t.pnl_r > 0 ? "text-emerald-500" : t.pnl_r < 0 ? "text-rose-500" : "text-text-main"
                        )}
                      >
                        {t.pnl_r > 0 ? `+${t.pnl_r.toFixed(2)}` : t.pnl_r.toFixed(2)} R
                      </span>
                      <span
                        className={cn(
                          "font-bold",
                          t.pnl_amount > 0 ? "text-emerald-500" : t.pnl_amount < 0 ? "text-rose-500" : "text-text-main"
                        )}
                      >
                        {t.pnl_amount >= 0 ? '+' : ''}${t.pnl_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <ExternalLink size={13} className="text-text-muted" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border-card text-[0.6875rem] uppercase font-semibold text-text-muted">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Symbol / Dir</th>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Setup</th>
                  <th className="py-2.5 px-3 text-right">Risk</th>
                  <th className="py-2.5 px-3 text-center">Outcome</th>
                  <th className="py-2.5 px-3 text-right">Result (R)</th>
                  <th className="py-2.5 px-3 text-right">Result ($)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card text-xs">
                {paginatedTrades.map((t) => {
                  const isLong = t.direction === 'LONG';
                  const isWin = t.outcome === 'TP';
                  const isLoss = t.outcome === 'SL';
                  const formattedDate = new Date(t.trade_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTrade(t)}
                      className="hover:bg-canvas/70 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-text-muted whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Symbol & Direction */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-semibold text-text-main">
                          <span>{t.symbol}</span>
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded-full text-[0.625rem] font-bold uppercase",
                              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}
                          >
                            {t.direction}
                          </span>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-3 text-text-muted">
                        <span className="truncate max-w-[110px] inline-block font-medium">
                          {t.account_name}
                        </span>
                      </td>

                      {/* Setup */}
                      <td className="py-3 px-3 text-text-muted">
                        <span className="truncate max-w-[120px] inline-block">
                          {t.setup_id ? playbooks[t.setup_id] || 'Setup' : '—'}
                        </span>
                      </td>

                      {/* Risk % & Dollar */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-text-muted">
                        <span>{t.risk_percent}%</span>
                        <span className="text-[0.625rem] block text-text-muted/80">
                          ${t.risk_amount.toFixed(0)}
                        </span>
                      </td>

                      {/* Outcome Badge */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase font-mono",
                            isWin ? "bg-emerald-500/10 text-emerald-500" :
                            isLoss ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                          )}
                        >
                          {t.outcome}
                        </span>
                      </td>

                      {/* Result in R */}
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-mono tabular-nums font-bold",
                          t.pnl_r > 0 ? "text-emerald-500" : t.pnl_r < 0 ? "text-rose-500" : "text-text-main"
                        )}
                      >
                        {t.pnl_r > 0 ? `+${t.pnl_r.toFixed(2)}` : t.pnl_r.toFixed(2)} R
                      </td>

                      {/* Result in $ */}
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-mono tabular-nums font-bold",
                          t.pnl_amount > 0 ? "text-emerald-500" : t.pnl_amount < 0 ? "text-rose-500" : "text-text-main"
                        )}
                      >
                        {t.pnl_amount >= 0 ? '+' : ''}${t.pnl_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <span className="w-7 h-7 rounded-[8px] bg-canvas flex items-center justify-center text-text-muted group-hover:text-blue-500 transition-colors mx-auto">
                          <ExternalLink size={13} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-border-card text-xs">
          <span className="text-text-muted font-mono text-[0.6875rem]">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
              className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 h-11 w-11 sm:h-8 sm:w-8 rounded-[14px] sm:rounded-[12px] bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
              className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 h-11 w-11 sm:h-8 sm:w-8 rounded-[14px] sm:rounded-[12px] bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

