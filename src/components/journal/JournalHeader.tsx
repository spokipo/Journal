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
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">Trading Journal</h1>
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono tabular-nums",
              activeTab === 'trades' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
            )}
          >
            {isLoading ? '—' : totalCount}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Execution history, setup analysis and watchlist ideas
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onNewIdea}
          className="h-11 md:h-10 px-4 rounded-[18px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
        >
          <Lightbulb size={16} />
          <span>New Idea</span>
        </button>
        <button
          type="button"
          onClick={onLogTrade}
          className="h-11 md:h-10 px-4 rounded-[18px] bg-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-all cursor-pointer shadow-sm shadow-blue-500/20 active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Log Trade</span>
        </button>
      </div>
    </div>
  );
}

