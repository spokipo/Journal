import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ActiveTab } from './types';

interface JournalErrorStateProps {
  activeTab: ActiveTab;
  onRetry: () => void;
}

export function JournalErrorState({ activeTab, onRetry }: JournalErrorStateProps) {
  return (
    <motion.div
      key="list-error"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="py-12 px-6 flex flex-col items-center text-center gap-3 bg-card border border-border-card rounded-[26px]"
    >
      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
        <AlertTriangle size={24} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-main">
          {activeTab === 'trades' ? "Couldn't load trades" : "Couldn't load ideas"}
        </h3>
        <p className="text-xs font-normal text-text-muted mt-1">
          There was a problem communicating with the database. Check your network or try again.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 h-10 px-4 rounded-[18px] bg-card border border-border-card text-text-main text-xs font-medium hover:bg-canvas transition-colors cursor-pointer flex items-center gap-2 active:scale-[0.98]"
      >
        <RotateCcw size={14} />
        <span>Retry</span>
      </button>
    </motion.div>
  );
}

