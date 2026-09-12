import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Search,
  Wallet,
  Timer,
  X, 
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select, type SelectOption } from '../ui/Select';
import { StatsCustomDatePicker } from './StatsCustomDatePicker';
import type { TradingAccount, FilterState, PeriodType } from '../../lib/statsEngine';

interface StatsToolbarProps {
  filters: FilterState;
  accounts: TradingAccount[];
  availableTimeframes?: string[];
  metricMode: 'dual' | 'r' | 'amount';
  onMetricModeChange: (mode: 'dual' | 'r' | 'amount') => void;
  onFilterChange: (nextFilters: FilterState) => void;
  onResetFilters: () => void;
}

const PERIOD_OPTIONS: { id: PeriodType; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
];

export function StatsToolbar({
  filters,
  accounts,
  availableTimeframes = [],
  metricMode,
  onMetricModeChange,
  onFilterChange,
  onResetFilters,
}: StatsToolbarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handlePeriodSelect = (period: PeriodType) => {
    if (period === 'custom') {
      setIsDatePickerOpen(true);
    } else {
      onFilterChange({ ...filters, period });
    }
  };

  const handleCustomDateApply = (start: string, end: string) => {
    onFilterChange({
      ...filters,
      period: 'custom',
      customStartDate: start,
      customEndDate: end,
    });
  };

  const accountSelectOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [
      { value: 'all', label: 'All Accounts' },
    ];
    accounts.forEach((acc) => {
      opts.push({
        value: acc.id,
        label: `${acc.name} (${acc.currency || 'USD'})`,
      });
    });
    return opts;
  }, [accounts]);

  const timeframeSelectOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [
      { value: 'all', label: 'All Timeframes' },
    ];
    if (availableTimeframes && availableTimeframes.length > 0) {
      availableTimeframes.forEach((tf) => {
        opts.push({ value: tf, label: tf });
      });
    }
    return opts;
  }, [availableTimeframes]);

  const mobilePeriodOptions = useMemo<SelectOption[]>(() => {
    return PERIOD_OPTIONS.map((p) => ({
      value: p.id,
      label: p.id === 'custom' && filters.period === 'custom' && filters.customStartDate && filters.customEndDate
        ? `Custom: ${filters.customStartDate} → ${filters.customEndDate}`
        : p.label,
    }));
  }, [filters.period, filters.customStartDate, filters.customEndDate]);

  const activeAccount = accounts.find((a) => a.id === filters.accountId);

  const hasActiveFilters =
    filters.period !== 'all' ||
    Boolean(filters.searchQuery) ||
    (filters.accountId && filters.accountId !== 'all') ||
    (filters.timeframe && filters.timeframe !== 'all');

  return (
    <div className="space-y-3 w-full">
      {/* ==================================================================== */}
      {/* DESKTOP TOOLBAR (md and above): Flat row of L1 controls, no h-scroll */}
      {/* ==================================================================== */}
      <div className="hidden md:flex items-center justify-between gap-3">
        {/* Left Side: Period Segmented Control (L1) */}
        <div className="flex items-center gap-1 bg-card border border-border-card rounded-full p-1 shrink-0 h-9">
          {PERIOD_OPTIONS.map((item) => {
            const isActive = filters.period === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePeriodSelect(item.id)}
                className={cn(
                  "relative h-7 px-3 text-xs font-medium rounded-full transition-colors whitespace-nowrap select-none cursor-pointer flex items-center justify-center",
                  isActive ? "text-white font-semibold" : "text-text-muted hover:text-text-main"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="stats-toolbar-period-pill"
                    className="absolute inset-0 bg-blue-500 rounded-full shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {item.id === 'custom' && <Calendar size={12} />}
                  {item.id === 'custom' && filters.period === 'custom' && filters.customStartDate && filters.customEndDate
                    ? `${filters.customStartDate.substring(5)} → ${filters.customEndDate.substring(5)}`
                    : item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Unit Toggle, Search, and Account Select */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Unit Toggle: Dual / R / $ (h-9 L1 container, h-7 inner control §2) */}
          <div className="flex items-center gap-0.5 bg-card border border-border-card rounded-full p-1 shrink-0 h-9">
            {[
              { id: 'dual', label: 'Dual' },
              { id: 'r', label: 'R-Multiple' },
              { id: 'amount', label: 'Monetary ($)' },
            ].map((mode) => {
              const isActive = metricMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onMetricModeChange(mode.id as any)}
                  className={cn(
                    "relative h-7 px-3 text-xs font-medium rounded-full transition-colors select-none cursor-pointer flex items-center justify-center",
                    isActive ? "text-blue-500 font-semibold" : "text-text-muted hover:text-text-main"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="stats-toolbar-metric-mode"
                      className="absolute inset-0 bg-blue-500/10 rounded-full border border-blue-500/20 shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input for Ticker / Notes */}
          <div className="relative w-36 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Search ticker..."
              className="w-full h-9 pl-8 pr-3 bg-card border border-border-card rounded-full text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Timeframe Select */}
          {timeframeSelectOptions.length > 1 && (
            <div className="shrink-0 w-36">
              <Select
                size="sm"
                icon={Timer}
                align="right"
                value={filters.timeframe || 'all'}
                onChange={(val) => onFilterChange({ ...filters, timeframe: val })}
                options={timeframeSelectOptions}
              />
            </div>
          )}

          {/* Account Select */}
          <div className="shrink-0 w-44">
            <Select
              size="sm"
              icon={Wallet}
              align="right"
              value={filters.accountId}
              onChange={(val) => onFilterChange({ ...filters, accountId: val })}
              options={accountSelectOptions}
            />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MOBILE TOOLBAR (< md): Strict §9 compliance (No horizontal scroll, >= 44px) */}
      {/* ==================================================================== */}
      <div className="flex md:hidden flex-col gap-3 w-full">
        {/* Row 1: Period Select & Account Select (h-11) */}
        <div className={cn(
          "grid gap-2 w-full",
          timeframeSelectOptions.length > 1 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
        )}>
          <div>
            <Select
              size="md"
              icon={Calendar}
              value={filters.period}
              onChange={(val) => handlePeriodSelect(val as any)}
              options={mobilePeriodOptions}
              className="w-full"
            />
          </div>
          <div>
            <Select
              size="md"
              icon={Wallet}
              value={filters.accountId}
              onChange={(val) => onFilterChange({ ...filters, accountId: val })}
              options={accountSelectOptions}
              className="w-full"
            />
          </div>
          {timeframeSelectOptions.length > 1 && (
            <div>
              <Select
                size="md"
                icon={Timer}
                value={filters.timeframe || 'all'}
                onChange={(val) => onFilterChange({ ...filters, timeframe: val })}
                options={timeframeSelectOptions}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Row 2: Search Input & Unit Select (h-11) */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Search ticker..."
              className="w-full h-11 pl-10 pr-3 bg-card border border-border-card rounded-full text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="shrink-0 w-36">
            <Select
              size="md"
              align="right"
              value={metricMode}
              onChange={(val) => onMetricModeChange(val as any)}
              options={[
                { value: 'dual', label: 'Dual Mode' },
                { value: 'r', label: 'R-Multiple' },
                { value: 'amount', label: 'Monetary ($)' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Active Filter Chips: flex-wrap without horizontal overflow per §9     */}
      {/* ==================================================================== */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[0.6875rem] uppercase font-semibold text-text-muted mr-1">
            Active:
          </span>

          {/* Period Chip */}
          {filters.period !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border-card text-xs text-text-main">
              <span>Period: {filters.period === 'custom' ? `${filters.customStartDate} → ${filters.customEndDate}` : filters.period}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, period: 'all', customStartDate: undefined, customEndDate: undefined })}
                className="hover:text-rose-500 transition-colors cursor-pointer"
                aria-label="Remove period filter"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {/* Timeframe Chip */}
          {filters.timeframe && filters.timeframe !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border-card text-xs text-text-main">
              <span>TF: {filters.timeframe}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, timeframe: 'all' })}
                className="hover:text-rose-500 transition-colors cursor-pointer"
                aria-label="Remove timeframe filter"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {/* Account Chip */}
          {filters.accountId && filters.accountId !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border-card text-xs text-text-main">
              <span>Account: {activeAccount ? activeAccount.name : filters.accountId}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, accountId: 'all' })}
                className="hover:text-rose-500 transition-colors cursor-pointer"
                aria-label="Remove account filter"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {/* Search Query Chip */}
          {filters.searchQuery && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border-card text-xs text-text-main">
              <span>Ticker: "{filters.searchQuery}"</span>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="hover:text-rose-500 transition-colors cursor-pointer"
                aria-label="Remove ticker filter"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {/* Reset all button */}
          <button
            type="button"
            onClick={onResetFilters}
            className="h-8 px-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-2 ml-1 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCcw size={12} />
            <span>Reset all</span>
          </button>
        </div>
      )}

      {/* Compact Date Picker Modal */}
      <StatsCustomDatePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        startDate={filters.customStartDate}
        endDate={filters.customEndDate}
        onApply={handleCustomDateApply}
      />
    </div>
  );
}