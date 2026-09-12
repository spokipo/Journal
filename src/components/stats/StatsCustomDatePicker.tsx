import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ModalShell } from '../ui/ModalShell';

interface StatsCustomDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onApply: (startDate: string, endDate: string) => void;
}

export function StatsCustomDatePicker({
  isOpen,
  onClose,
  startDate: initialStart,
  endDate: initialEnd,
  onApply,
}: StatsCustomDatePickerProps) {
  const today = new Date();
  const formatYmd = (d: Date) => d.toISOString().substring(0, 10);

  const defaultStart = initialStart || formatYmd(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultEnd = initialEnd || formatYmd(today);

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(defaultEnd);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  useEffect(() => {
    if (isOpen) {
      setStart(initialStart || defaultStart);
      setEnd(initialEnd || defaultEnd);
      const d = new Date(initialEnd || defaultEnd);
      if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [isOpen, initialStart, initialEnd]);

  // Calendar logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun
  // Monday as first day: 0=Mon, 6=Sun
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    const clickedYmd = formatYmd(clickedDate);

    if (!start || (start && end)) {
      setStart(clickedYmd);
      setEnd('');
    } else {
      if (clickedYmd < start) {
        setEnd(start);
        setStart(clickedYmd);
      } else {
        setEnd(clickedYmd);
      }
    }
  };

  const handlePreset = (daysAgo: number) => {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - daysAgo);
    setStart(formatYmd(past));
    setEnd(formatYmd(now));
  };

  const handleThisMonthPreset = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    setStart(formatYmd(first));
    setEnd(formatYmd(now));
  };

  const handleThisYearPreset = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), 0, 1);
    setStart(formatYmd(first));
    setEnd(formatYmd(now));
  };

  const handleConfirm = () => {
    const finalStart = start || formatYmd(today);
    const finalEnd = end || finalStart;
    onApply(finalStart, finalEnd);
    onClose();
  };

  const isSelected = (day: number) => {
    const current = formatYmd(new Date(year, month, day));
    return current === start || current === end;
  };

  const isInRange = (day: number) => {
    if (!start || !end) return false;
    const current = formatYmd(new Date(year, month, day));
    return current > start && current < end;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Custom Date Range"
      mobileTitle="Date Range"
      size="sm"
      desktopIcon={<Calendar size={18} />}
      desktopIconClass="bg-blue-500/10 text-blue-500"
      mobileRightAction={{
        icon: <Check size={18} />,
        onClick: handleConfirm,
        ariaLabel: 'Apply date range',
        isPrimary: true,
      }}
      desktopFooterLeft={
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-4 rounded-full bg-canvas border border-border-card text-xs font-semibold text-text-main hover:bg-card active:scale-[0.98] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      }
      desktopFooterRight={
        <button
          type="button"
          onClick={handleConfirm}
          className="h-10 px-4 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Check size={14} />
          <span>Apply Range</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePreset(7)}
            className="px-2.5 py-1 text-xs rounded-full bg-canvas text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            Last 7D
          </button>
          <button
            type="button"
            onClick={() => handlePreset(30)}
            className="px-2.5 py-1 text-xs rounded-full bg-canvas text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            Last 30D
          </button>
          <button
            type="button"
            onClick={() => handlePreset(90)}
            className="px-2.5 py-1 text-xs rounded-full bg-canvas text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            Last 90D
          </button>
          <button
            type="button"
            onClick={handleThisMonthPreset}
            className="px-2.5 py-1 text-xs rounded-full bg-canvas text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={handleThisYearPreset}
            className="px-2.5 py-1 text-xs rounded-full bg-canvas text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            This Year
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-text-main uppercase tracking-wider font-mono">
            {monthName}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card border border-border-card transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {/* Day Headers (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d} className="text-[0.6875rem] font-medium text-text-muted font-mono py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const inRange = isInRange(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "h-8 rounded-[10px] text-xs font-mono tabular-nums flex items-center justify-center transition-all cursor-pointer select-none",
                    selected && "bg-blue-500 text-white font-semibold shadow-xs",
                    inRange && !selected && "bg-blue-500/15 text-blue-500 font-medium",
                    !selected && !inRange && "text-text-main hover:bg-canvas"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Inputs Display */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-card">
          <div>
            <label className="text-[0.6875rem] text-text-muted font-medium block mb-1">Start Date</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full h-9 bg-canvas border border-border-card rounded-[14px] px-2.5 text-xs text-text-main font-mono outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[0.6875rem] text-text-muted font-medium block mb-1">End Date</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full h-9 bg-canvas border border-border-card rounded-[14px] px-2.5 text-xs text-text-main font-mono outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Mobile Action Button */}
        <div className="pt-2 md:hidden">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full h-11 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <Check size={16} />
            <span>Apply Range</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}


