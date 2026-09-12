import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Lightbulb, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ActiveTab } from './types';

interface JournalEmptyStateProps {
  activeTab: ActiveTab;
  activeFilterCount: number;
  onResetFilters: () => void;
  onAction: () => void;
}

export function JournalEmptyState({
  activeTab,
  activeFilterCount,
  onResetFilters,
  onAction,
}: JournalEmptyStateProps) {
  const isTrades = activeTab === 'trades';

  return (
    <motion.div
      key={isTrades ? 'journal-trades-empty' : 'journal-ideas-empty'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]"
    >
      {/* Icon in canvas circle (§7 Empty state) */}
      <div className="w-12 h-12 rounded-full bg-canvas text-text-muted flex items-center justify-center">
        {isTrades ? <Zap size={24} /> : <Lightbulb size={24} />}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-main">
          {isTrades ? 'No trades found' : 'No watchlist ideas'}
        </h3>
        <p className="text-xs font-normal text-text-muted mt-1">
          {isTrades
            ? 'Log your first closed execution or change current filters'
            : 'Record setups you are tracking before entering'}
        </p>
      </div>

      {activeFilterCount > 0 ? (
        /* Кнопка сброса с безопасным touch-таргетом 44px на мобиле (§9) */
        <button
          type="button"
          onClick={onResetFilters}
          className={cn(
            "mt-2 min-h-11 md:h-10 px-4 rounded-full flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-all bg-canvas border border-border-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 shadow-xs",
            isTrades
              ? "text-blue-500 hover:bg-card focus-visible:ring-blue-500"
              : "text-amber-500 hover:bg-card focus-visible:ring-amber-500"
          )}
        >
          <RotateCcw size={14} />
          <span>Reset all filters</span>
        </button>
      ) : (
        /* Standalone primary button: rounded-full, h-11 mobile / h-10 desktop (§4, §9) */
        <button
          type="button"
          onClick={onAction}
          className={
            isTrades
              ? "mt-2 h-11 md:h-10 px-5 rounded-full bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              : "mt-2 h-11 md:h-10 px-5 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 active:scale-[0.98] text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          }
        >
          {isTrades ? 'Log first trade' : 'Create first idea'}
        </button>
      )}
    </motion.div>
  );
}