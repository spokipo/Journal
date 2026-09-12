import React from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ActiveTab } from './types';

interface JournalHeaderProps {
  activeTab: ActiveTab;
  totalCount: number;
  isLoading: boolean;
  onNewIdea: () => void;
  onLogTrade: () => void;
}

export function JournalHeader({
  activeTab,
  totalCount,
  isLoading,
  onNewIdea,
  onLogTrade,
}: JournalHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      {/* Page Header (§3) */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">
            Trading Journal
          </h1>
          {/* Pill / Badge (§4): px-2 py-0.5, rounded-full, text-[0.6875rem] font-bold */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono tabular-nums uppercase",
              activeTab === 'trades'
                ? "bg-blue-500/10 text-blue-500"
                : "bg-amber-500/10 text-amber-500"
            )}
          >
            {isLoading ? '—' : totalCount}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Execution history, setup analysis and watchlist ideas
        </p>
      </div>

      {/* Header Actions (§4 Button, §9 Touch targets: h-11 mobile / h-10 desktop, rounded-full) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onNewIdea}
          className="h-11 md:h-10 px-4 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-sm font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Lightbulb size={14} />
          <span>New Idea</span>
        </button>

        <button
          type="button"
          onClick={onLogTrade}
          className="h-11 md:h-10 px-4.5 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus size={14} />
          <span>Log Trade</span>
        </button>
      </div>
    </div>
  );
}