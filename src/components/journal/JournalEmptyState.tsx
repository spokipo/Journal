import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Lightbulb, RotateCcw } from 'lucide-react';
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
      key={isTrades ? 'trades-empty' : 'ideas-empty'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]"
    >
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
        <button
          type="button"
          onClick={onResetFilters}
          className={`mt-2 text-xs hover:underline flex items-center gap-1 cursor-pointer ${
            isTrades ? 'text-blue-500' : 'text-amber-500'
          }`}
        >
          <RotateCcw size={12} />
          <span>Reset all filters</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onAction}
          className={
            isTrades
              ? "mt-2 h-11 md:h-10 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors cursor-pointer active:scale-[0.98]"
              : "mt-2 h-11 md:h-10 px-4 rounded-[18px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer active:scale-[0.98]"
          }
        >
          {isTrades ? 'Log first trade' : 'Create first idea'}
        </button>
      )}
    </motion.div>
  );
}

