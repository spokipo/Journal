import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Search,
  Wallet,
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

  // Account options for Select
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

  // Mobile period select options (conforming to §9: 4+ items segmented control -> Select)
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
    (filters.accountId && filters.accountId !== 'all');

  return (
    <div className="space-y-2.5 w-full">
      {/* ==================================================================== */}
      {/* DESKTOP TOOLBAR (md and above): Flat row of L1 controls, no h-scroll */}
      {/* ==================================================================== */}
      <div className="hidden md:flex items-center justify-between gap-3">
        {/* Left Side: Period Segmented Control (L1) */}
        <div className="flex items-center gap-1 bg-card border border-border-card rounded-[18px] p-1 shrink-0">
          {PERIOD_OPTIONS.map((item) => {
            const isActive = filters.period === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePeriodSelect(item.id)}
                className={cn(
                  "relative h-7 px-3 text-xs font-medium rounded-[14px] transition-colors whitespace-nowrap select-none cursor-pointer flex items-center justify-center",
                  isActive ? "text-white font-semibold" : "text-text-muted hover:text-text-main"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="stats-period-pill"
                    className="absolute inset-0 bg-blue-500 rounded-[14px] shadow-sm"
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
          {/* Unit Toggle: Dual / R / $ */}
          <div className="flex items-center gap-0.5 bg-card border border-border-card rounded-[18px] p-1 shrink-0">
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
                    "relative h-7 px-2.5 text-xs font-medium rounded-[14px] transition-colors select-none cursor-pointer flex items-center justify-center",
                    isActive ? "text-blue-500 font-semibold" : "text-text-muted hover:text-text-main"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="stats-unit-pill"
                      className="absolute inset-0 bg-blue-500/10 rounded-[14px]"
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
              className="w-full h-9 pl-8 pr-3 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Account Select (Replaces Filter select) */}
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
      <div className="flex md:hidden flex-col gap-2.5 w-full">
        {/* Row 1: Period Select (replaces horizontal scroll per §9) & Account Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {/* Period Select for mobile */}
          <div>
            <Select
              size="md"
              icon={Calendar}
              value={filters.period}
              onChange={(val) => handlePeriodSelect(val as PeriodType)}
              options={mobilePeriodOptions}
            />
          </div>

          {/* Account Select for mobile */}
          <div>
            <Select
              size="md"
              icon={Wallet}
              value={filters.accountId}
              onChange={(val) => onFilterChange({ ...filters, accountId: val })}
              options={accountSelectOptions}
            />
          </div>
        </div>

        {/* Row 2: Search input + Unit toggle (Full width, no horizontal scroll, min-h-11) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {/* Search Input */}
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Search ticker..."
              className="w-full min-h-11 pl-9 pr-3 bg-card border border-border-card rounded-[18px] text-xs font-medium text-text-main placeholder:text-text-muted outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Unit 3-Mode Toggle on Mobile (>= 44px hit area per §9) */}
          <div className="grid grid-cols-3 gap-1 bg-card border border-border-card rounded-[18px] p-1 min-h-11 items-center">
            {[
              { id: 'dual', label: 'Dual' },
              { id: 'r', label: 'R' },
              { id: 'amount', label: '$' },
            ].map((mode) => {
              const isActive = metricMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onMetricModeChange(mode.id as any)}
                  className={cn(
                    "relative min-h-[36px] px-2 text-xs font-semibold rounded-[14px] transition-colors select-none cursor-pointer flex items-center justify-center",
                    isActive ? "bg-blue-500/15 text-blue-500" : "text-text-muted hover:text-text-main"
                  )}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Active Filter Chips: flex-wrap without horizontal overflow per §9     */}
      {/* ==================================================================== */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[0.6875rem] uppercase font-semibold text-text-muted mr-1">
            Active:
          </span>

          {/* Period Chip */}
          {filters.period !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[12px] bg-card border border-border-card text-xs text-text-main">
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

          {/* Account Chip */}
          {filters.accountId && filters.accountId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[12px] bg-card border border-border-card text-xs text-text-main">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[12px] bg-card border border-border-card text-xs text-text-main">
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
            className="text-xs text-blue-500 hover:underline flex items-center gap-1 ml-1 cursor-pointer min-h-[32px]"
          >
            <RotateCcw size={12} />
            Reset all
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
