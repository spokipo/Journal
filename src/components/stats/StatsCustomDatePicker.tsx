import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-card border border-border-card rounded-[26px] p-5 shadow-2xl flex flex-col space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[14px] bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">Custom Date Range</h3>
              <p className="text-[0.6875rem] text-text-muted">Select analysis timeframe</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset(7)}
            className="px-2.5 py-1 text-xs rounded-[14px] bg-canvas text-text-muted hover:text-text-main hover:bg-canvas/80 border border-border-card transition-colors"
          >
            Last 7D
          </button>
          <button
            type="button"
            onClick={() => handlePreset(30)}
            className="px-2.5 py-1 text-xs rounded-[14px] bg-canvas text-text-muted hover:text-text-main hover:bg-canvas/80 border border-border-card transition-colors"
          >
            Last 30D
          </button>
          <button
            type="button"
            onClick={() => handlePreset(90)}
            className="px-2.5 py-1 text-xs rounded-[14px] bg-canvas text-text-muted hover:text-text-main hover:bg-canvas/80 border border-border-card transition-colors"
          >
            Last 90D
          </button>
          <button
            type="button"
            onClick={handleThisMonthPreset}
            className="px-2.5 py-1 text-xs rounded-[14px] bg-canvas text-text-muted hover:text-text-main hover:bg-canvas/80 border border-border-card transition-colors"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={handleThisYearPreset}
            className="px-2.5 py-1 text-xs rounded-[14px] bg-canvas text-text-muted hover:text-text-main hover:bg-canvas/80 border border-border-card transition-colors"
          >
            This Year
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-[14px] flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-text-main uppercase tracking-wider font-mono">
            {monthName}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-[14px] flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors"
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
                    selected && "bg-blue-500 text-white font-semibold shadow-sm",
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 md:h-9 px-4 rounded-[18px] bg-card border border-border-card text-xs font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-10 md:h-9 px-4 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Check size={14} />
            Apply Range
          </button>
        </div>
      </motion.div>
    </div>
  );
}

