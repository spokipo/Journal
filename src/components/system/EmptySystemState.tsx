import React from 'react';
import { Layers, Sparkles, Plus } from 'lucide-react';

interface EmptySystemStateProps {
  onInitializeDefaults: () => void;
  onOpenCreateModal: () => void;
}

export function EmptySystemState({
  onInitializeDefaults,
  onOpenCreateModal,
}: EmptySystemStateProps) {
  return (
    <div className="p-8 sm:p-12 bg-card border border-border-card rounded-[26px] flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto shadow-xs">
      <div className="w-16 h-16 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted">
        <Layers size={28} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text-main">
          No System Sections Yet
        </h3>
        <p className="text-xs text-text-muted max-w-md">
          Create a personalized trading knowledge base to record your risk rules, daily routines, entry criteria, and psychology reminders.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onInitializeDefaults}
          className="w-full sm:w-auto min-h-11 h-11 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Sparkles size={15} />
          <span>Initialize Starter System</span>
        </button>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="w-full sm:w-auto min-h-11 h-11 px-5 rounded-full bg-card border border-border-card text-xs font-semibold text-text-main hover:bg-canvas active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus size={15} />
          <span>Create Custom Section</span>
        </button>
      </div>
    </div>
  );
}
