import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Lightbulb,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  RotateCcw,
  SlidersHorizontal,
  X,
  Wallet,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select, type SelectOption } from '../ui/Select';
import {
  SORT_OPTIONS,
  IDEA_STATUS_OPTIONS,
  SESSION_LABELS,
  type ActiveTab,
  type ViewMode,
  type SortOptionKey,
} from './types';

interface JournalToolbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOptionKey;
  onSortChange: (sort: SortOptionKey) => void;
  selectedIdeaStatus: string;
  onIdeaStatusChange: (status: string) => void;
  filterSelectOptions: SelectOption[];
  selectedFilterValues: string[];
  onFilterChange: (vals: string[]) => void;
  activeFilterCount: number;
  resetFilters: () => void;
  removeFilter: (type: 'account' | 'outcome' | 'session' | 'setup' | 'mistake', id: string) => void;
  selectedAccounts: string[];
  selectedOutcomes: string[];
  selectedSessions: string[];
  selectedSetups: string[];
  selectedMistakes: string[];
  accountsMap: Record<string, string>;
  playbooks: Record<string, string>;
  mistakes: Record<string, string>;
}

export function JournalToolbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  selectedIdeaStatus,
  onIdeaStatusChange,
  filterSelectOptions,
  selectedFilterValues,
  onFilterChange,
  activeFilterCount,
  resetFilters,
  removeFilter,
  selectedAccounts,
  selectedOutcomes,
  selectedSessions,
  selectedSetups,
  selectedMistakes,
  accountsMap,
  playbooks,
  mistakes,
}: JournalToolbarProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) {
        setIsMobileFilterOpen(false);
      }
    };
    if (isMobileFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileFilterOpen]);

  return (
    <div className="flex flex-col gap-2 relative z-30 w-full">
      <div className="flex items-center justify-between gap-2 md:gap-3 w-full">
        {/* Tab switch */}
        <div className="flex p-1 bg-card border border-border-card rounded-[18px] h-11 md:h-9 items-center flex-1 md:flex-initial shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('trades')}
            className={cn(
              "relative z-10 flex-1 md:flex-none h-9 md:h-7 px-4 rounded-[14px] text-xs font-medium transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5",
              activeTab === 'trades' ? "text-white" : "text-text-muted hover:text-text-main"
            )}
          >
            {activeTab === 'trades' && (
              <motion.div
                layoutId="journal-tab-pill-main"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-blue-500 rounded-[14px] -z-10"
              />
            )}
            <Zap size={14} />
            <span>Trades</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('ideas')}
            className={cn(
              "relative z-10 flex-1 md:flex-none h-9 md:h-7 px-4 rounded-[14px] text-xs font-medium transition-colors cursor-pointer select-none flex items-center justify-center gap-1.5",
              activeTab === 'ideas' ? "text-white" : "text-text-muted hover:text-text-main"
            )}
          >
            {activeTab === 'ideas' && (
              <motion.div
                layoutId="journal-tab-pill-main"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-amber-500 rounded-[14px] -z-10"
              />
            )}
            <Lightbulb size={14} />
            <span>Watchlist</span>
          </button>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2 md:ml-auto">
          <div className="relative w-44 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-8 pr-3 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {activeTab === 'trades' ? (
            <>
              <div className="shrink-0 w-36">
                <Select
                  size="sm"
                  icon={SlidersHorizontal}
                  placeholder="Filter"
                  multiple
                  value={selectedFilterValues}
                  onChange={onFilterChange}
                  options={filterSelectOptions}
                />
              </div>

              <div className="shrink-0 w-36">
                <Select
                  size="sm"
                  icon={ArrowUpDown}
                  value={sortBy}
                  onChange={(v) => onSortChange(v as SortOptionKey)}
                  options={SORT_OPTIONS}
                />
              </div>
            </>
          ) : (
            <div className="shrink-0 w-44">
              <Select
                size="sm"
                icon={SlidersHorizontal}
                placeholder="Status"
                value={selectedIdeaStatus}
                onChange={(v) => onIdeaStatusChange(v as string)}
                options={IDEA_STATUS_OPTIONS}
              />
            </div>
          )}

          <div className="flex p-1 bg-card border border-border-card rounded-[18px] h-9 items-center shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "relative w-8 h-7 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
                viewMode === 'grid' ? "text-text-main" : "text-text-muted hover:text-text-main"
              )}
              aria-label="Grid layout"
            >
              <LayoutGrid size={14} className="relative z-10" />
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="journal-view-toggle-mode"
                  className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                  transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={cn(
                "relative w-8 h-7 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
                viewMode === 'list' ? "text-text-main" : "text-text-muted hover:text-text-main"
              )}
              aria-label="List layout"
            >
              <List size={14} className="relative z-10" />
              {viewMode === 'list' && (
                <motion.div
                  layoutId="journal-view-toggle-mode"
                  className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                  transition={{ type: 'spring', damping: 30, stiffness: 450 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Mobile ViewMode buttons */}
        <div className="flex md:hidden p-1 bg-card border border-border-card rounded-[18px] h-11 items-center shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "relative w-10 h-9 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
              viewMode === 'grid' ? "text-text-main" : "text-text-muted hover:text-text-main"
            )}
            aria-label="Grid layout"
          >
            <LayoutGrid size={16} className="relative z-10" />
            {viewMode === 'grid' && (
              <motion.div
                layoutId="journal-view-toggle-mode-mobile"
                className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                transition={{ type: 'spring', damping: 30, stiffness: 450 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={cn(
              "relative w-10 h-9 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer z-10",
              viewMode === 'list' ? "text-text-main" : "text-text-muted hover:text-text-main"
            )}
            aria-label="List layout"
          >
            <List size={16} className="relative z-10" />
            {viewMode === 'list' && (
              <motion.div
                layoutId="journal-view-toggle-mode-mobile"
                className="absolute inset-0 bg-canvas rounded-[14px] border border-border-card shadow-sm"
                transition={{ type: 'spring', damping: 30, stiffness: 450 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search & Filter */}
      <div className="flex md:hidden items-center gap-2 w-full relative">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={activeTab === 'trades' ? "Search trades, setups..." : "Search ideas, setups..."}
            className="w-full h-11 pl-10 pr-3 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="relative shrink-0" ref={mobileFilterRef}>
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen((prev) => !prev)}
            aria-label="Filter & display options"
            className={cn(
              "relative w-11 h-11 rounded-[18px] border flex items-center justify-center transition-colors cursor-pointer",
              isMobileFilterOpen || activeFilterCount > 0
                ? "bg-card border-blue-500 text-blue-500 shadow-sm"
                : "bg-card border-border-card text-text-muted hover:text-text-main"
            )}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[0.625rem] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isMobileFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-card border border-border-card rounded-[18px] p-3 shadow-xl z-50 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border-card">
                  <span className="text-xs font-semibold text-text-main uppercase tracking-wider">
                    {activeTab === 'trades' ? "Trade Filters" : "Idea Filters"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {activeTab === 'trades' ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Filter</label>
                      <Select
                        size="md"
                        icon={SlidersHorizontal}
                        placeholder="Select filters"
                        multiple
                        value={selectedFilterValues}
                        onChange={onFilterChange}
                        options={filterSelectOptions}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Sort By</label>
                      <Select
                        size="md"
                        icon={ArrowUpDown}
                        value={sortBy}
                        onChange={(v) => onSortChange(v as SortOptionKey)}
                        options={SORT_OPTIONS}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[0.6875rem] font-semibold text-text-muted uppercase">Status</label>
                    <Select
                      size="md"
                      icon={SlidersHorizontal}
                      value={selectedIdeaStatus}
                      onChange={(v) => onIdeaStatusChange(v as string)}
                      options={IDEA_STATUS_OPTIONS}
                    />
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <div className="pt-2 border-t border-border-card flex items-center justify-between">
                    <span className="text-[0.6875rem] text-text-muted font-mono">{activeFilterCount} active</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetFilters();
                        setIsMobileFilterOpen(false);
                      }}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw size={11} />
                      <span>Reset all</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {selectedAccounts.map((id) => (
            <div
              key={id}
              className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
            >
              <Wallet size={10} className="shrink-0" />
              <span>Account: {accountsMap[id] || id}</span>
              <button
                type="button"
                onClick={() => removeFilter('account', id)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {selectedOutcomes.map((val) => (
            <div
              key={val}
              className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
            >
              <span>Outcome: {val}</span>
              <button
                type="button"
                onClick={() => removeFilter('outcome', val)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {selectedSessions.map((val) => (
            <div
              key={val}
              className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
            >
              <span>Session: {SESSION_LABELS[val] || val}</span>
              <button
                type="button"
                onClick={() => removeFilter('session', val)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {selectedSetups.map((id) => (
            <div
              key={id}
              className="h-6 pl-2.5 pr-1 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium flex items-center gap-1"
            >
              <span>Setup: {playbooks[id] || id}</span>
              <button
                type="button"
                onClick={() => removeFilter('setup', id)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {selectedMistakes.map((id) => (
            <div
              key={id}
              className="h-6 pl-2.5 pr-1 rounded-full bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium flex items-center gap-1"
            >
              <span>Mistake: {mistakes[id] || id}</span>
              <button
                type="button"
                onClick={() => removeFilter('mistake', id)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-rose-500/20 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {activeTab === 'ideas' && selectedIdeaStatus !== 'all' && (
            <div className="h-6 pl-2.5 pr-1 rounded-full bg-amber-500/10 text-amber-500 text-[0.6875rem] font-medium flex items-center gap-1">
              <span>Status: {IDEA_STATUS_OPTIONS.find((o) => o.value === selectedIdeaStatus)?.label || selectedIdeaStatus}</span>
              <button
                type="button"
                onClick={() => resetFilters()}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-amber-500/20 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={resetFilters}
            className="text-[0.6875rem] text-text-muted hover:text-text-main flex items-center gap-1 ml-1 cursor-pointer"
          >
            <RotateCcw size={10} />
            <span>Clear all</span>
          </button>
        </div>
      )}
    </div>
  );
}

