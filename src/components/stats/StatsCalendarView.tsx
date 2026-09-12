import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Table as TableIcon,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StatsSummary, EnrichedTrade, YearPerformance } from '../../lib/statsEngine';

interface StatsCalendarViewProps {
  stats: StatsSummary;
  trades: EnrichedTrade[];
  metricMode: 'dual' | 'r' | 'amount';
  onSelectTrade?: (trade: EnrichedTrade) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StatsCalendarView({
  stats,
  trades,
  metricMode,
  onSelectTrade,
}: StatsCalendarViewProps) {
  const [subView, setSubView] = useState<'calendar' | 'matrix'>('calendar');
  
  // Current calendar month view state
  const [currentDate, setCurrentDate] = useState(() => {
    if (trades.length > 0) {
      // Set to latest trade date
      const last = trades[trades.length - 1];
      const d = new Date(last.trade_date);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDayKey(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDayKey(null);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayKey(null);
  };

  // Group all trades by date string YYYY-MM-DD
  const tradesByDay = useMemo(() => {
    const map = new Map<string, EnrichedTrade[]>();
    trades.forEach((t) => {
      const dateKey = t.trade_date.substring(0, 10);
      const list = map.get(dateKey) || [];
      list.push(t);
      map.set(dateKey, list);
    });
    return map;
  }, [trades]);

  // Aggregate monthly stats for the currently selected calendar month
  const currentMonthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthTrades = trades.filter((t) => t.trade_date.startsWith(prefix));

    let netR = 0;
    let netAmount = 0;
    let winCount = 0;
    let lossCount = 0;
    let beCount = 0;
    let greenDays = 0;
    let redDays = 0;
    let beDays = 0;

    const daysWithTrades = new Set<string>();

    monthTrades.forEach((t) => {
      netR += t.pnl_r;
      if (t.pnl_amount !== null && t.pnl_amount !== undefined) {
        netAmount += t.pnl_amount;
      }
      if (t.outcome === 'TP') winCount++;
      else if (t.outcome === 'SL') lossCount++;
      else beCount++;

      daysWithTrades.add(t.trade_date.substring(0, 10));
    });

    daysWithTrades.forEach((dayKey) => {
      const dayTrades = tradesByDay.get(dayKey) || [];
      const dayR = dayTrades.reduce((acc, tr) => acc + tr.pnl_r, 0);
      if (dayR > 0) greenDays++;
      else if (dayR < 0) redDays++;
      else beDays++;
    });

    const totalTrades = monthTrades.length;
    const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0;

    return {
      netR: Number(netR.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      totalTrades,
      winCount,
      lossCount,
      beCount,
      winRate,
      greenDays,
      redDays,
      beDays,
      activeDays: daysWithTrades.size,
    };
  }, [trades, currentYear, currentMonth, tradesByDay]);

  // Generate calendar grid cells (Monday to Sunday)
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Monday-based: 0 for Mon, 6 for Sun
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDaysInMonth = lastDay.getDate();
    const cells: {
      dateKey: string;
      dayNum: number;
      isCurrentMonth: boolean;
      trades: EnrichedTrade[];
      netR: number;
      netAmount: number | null;
      winCount: number;
      lossCount: number;
      beCount: number;
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, day);
      const prevYear = prevDate.getFullYear();
      const prevMo = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dateKey = `${prevYear}-${prevMo}-${String(day).padStart(2, '0')}`;
      const dayTrades = tradesByDay.get(dateKey) || [];
      cells.push({
        dateKey,
        dayNum: day,
        isCurrentMonth: false,
        trades: dayTrades,
        netR: dayTrades.reduce((acc, t) => acc + t.pnl_r, 0),
        netAmount: dayTrades.reduce((acc, t) => acc + (t.pnl_amount ?? 0), 0),
        winCount: dayTrades.filter((t) => t.outcome === 'TP').length,
        lossCount: dayTrades.filter((t) => t.outcome === 'SL').length,
        beCount: dayTrades.filter((t) => t.outcome === 'BE').length,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTrades = tradesByDay.get(dateKey) || [];
      cells.push({
        dateKey,
        dayNum: day,
        isCurrentMonth: true,
        trades: dayTrades,
        netR: dayTrades.reduce((acc, t) => acc + t.pnl_r, 0),
        netAmount: dayTrades.reduce((acc, t) => acc + (t.pnl_amount ?? 0), 0),
        winCount: dayTrades.filter((t) => t.outcome === 'TP').length,
        lossCount: dayTrades.filter((t) => t.outcome === 'SL').length,
        beCount: dayTrades.filter((t) => t.outcome === 'BE').length,
      });
    }

    // Next month padding to fill multiple of 7
    const remainingCells = 7 - (cells.length % 7);
    if (remainingCells < 7) {
      for (let day = 1; day <= remainingCells; day++) {
        const nextDate = new Date(currentYear, currentMonth + 1, day);
        const nextYear = nextDate.getFullYear();
        const nextMo = String(nextDate.getMonth() + 1).padStart(2, '0');
        const dateKey = `${nextYear}-${nextMo}-${String(day).padStart(2, '0')}`;
        const dayTrades = tradesByDay.get(dateKey) || [];
        cells.push({
          dateKey,
          dayNum: day,
          isCurrentMonth: false,
          trades: dayTrades,
          netR: dayTrades.reduce((acc, t) => acc + t.pnl_r, 0),
          netAmount: dayTrades.reduce((acc, t) => acc + (t.pnl_amount ?? 0), 0),
          winCount: dayTrades.filter((t) => t.outcome === 'TP').length,
          lossCount: dayTrades.filter((t) => t.outcome === 'SL').length,
          beCount: dayTrades.filter((t) => t.outcome === 'BE').length,
        });
      }
    }

    return cells;
  }, [currentYear, currentMonth, tradesByDay]);

  const selectedDayTrades = selectedDayKey ? tradesByDay.get(selectedDayKey) || [] : [];

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}$${abs}`;
  };

  return (
    <div className="bg-card border border-border-card rounded-[26px] p-5 shadow-sm space-y-4">
      {/* 1. Header with Title & View Switcher (Calendar vs Matrix) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-card">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-main">Trading Calendar & Monthly Matrix</h3>
            <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono uppercase bg-blue-500/10 text-blue-500">
              Journal View
            </span>
          </div>
          <p className="text-[0.6875rem] text-text-muted mt-0.5">
            Daily performance heat-grid and historical MT5-style monthly returns table
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-canvas border border-border-card rounded-full p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubView('calendar')}
            className={cn(
              "relative h-7 px-3 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5",
              subView === 'calendar' ? "text-blue-500 font-semibold" : "text-text-muted hover:text-text-main"
            )}
          >
            {subView === 'calendar' && (
              <motion.div
                layoutId="stats-cal-subview-pill"
                className="absolute inset-0 bg-card rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <CalendarIcon size={13} />
              <span>Calendar</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('matrix')}
            className={cn(
              "relative h-7 px-3 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5",
              subView === 'matrix' ? "text-blue-500 font-semibold" : "text-text-muted hover:text-text-main"
            )}
          >
            {subView === 'matrix' && (
              <motion.div
                layoutId="stats-cal-subview-pill"
                className="absolute inset-0 bg-card rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <TableIcon size={13} />
              <span>Monthly Matrix</span>
            </span>
          </button>
        </div>
      </div>

      {/* 2. SUB-VIEW A: MONTHLY INTERACTIVE CALENDAR */}
      {subView === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Month Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[20px] bg-canvas/60 border border-border-card">
            {/* Month Nav Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="w-8 h-8 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <h4 className="text-sm font-bold text-text-main font-mono px-2 min-w-[140px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h4>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="w-8 h-8 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="h-8 px-3 rounded-full bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer ml-1"
              >
                Today
              </button>
            </div>

            {/* Monthly Summary Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className={cn(
                "px-2.5 py-1 rounded-full font-bold",
                currentMonthStats.netR > 0 ? "bg-emerald-500/10 text-emerald-500" :
                currentMonthStats.netR < 0 ? "bg-rose-500/10 text-rose-500" : "bg-card text-text-muted border border-border-card"
              )}>
                {metricMode === 'amount'
                  ? formatMoney(currentMonthStats.netAmount)
                  : `${currentMonthStats.netR > 0 ? '+' : ''}${currentMonthStats.netR.toFixed(2)} R`}
              </span>

              <span className="px-2.5 py-1 rounded-full bg-card border border-border-card text-text-muted">
                {currentMonthStats.totalTrades} {currentMonthStats.totalTrades === 1 ? 'trade' : 'trades'}
              </span>

              <span className="px-2.5 py-1 rounded-full bg-card border border-border-card text-text-muted">
                {currentMonthStats.winRate}% WR
              </span>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border-card text-[0.6875rem]">
                <span className="text-emerald-500 font-bold">{currentMonthStats.greenDays}G</span>
                <span>•</span>
                <span className="text-rose-500 font-bold">{currentMonthStats.redDays}R</span>
                {currentMonthStats.beDays > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-500 font-bold">{currentMonthStats.beDays}BE</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[0.6875rem] font-semibold text-text-muted uppercase tracking-wider">
            {WEEK_DAYS.map((wd) => (
              <div key={wd} className="py-1">{wd}</div>
            ))}
          </div>

          {/* Month Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarGrid.map((cell) => {
              const hasTrades = cell.trades.length > 0;
              const isPos = cell.netR > 0;
              const isNeg = cell.netR < 0;
              const isSelected = selectedDayKey === cell.dateKey;

              return (
                <div
                  key={cell.dateKey}
                  onClick={() => {
                    if (hasTrades) {
                      setSelectedDayKey(isSelected ? null : cell.dateKey);
                    }
                  }}
                  className={cn(
                    "min-h-[64px] sm:min-h-[82px] rounded-[16px] sm:rounded-[18px] p-2 flex flex-col justify-between transition-all border",
                    !cell.isCurrentMonth && "opacity-25 pointer-events-none",
                    hasTrades ? "cursor-pointer active:scale-95" : "cursor-default",
                    isSelected ? "ring-2 ring-blue-500 shadow-md" : "",
                    hasTrades
                      ? isPos
                        ? "bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-500/50 text-emerald-500"
                        : isNeg
                        ? "bg-rose-500/10 border-rose-500/25 hover:border-rose-500/50 text-rose-500"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-500"
                      : "bg-canvas/40 border-border-card/50 text-text-muted"
                  )}
                >
                  {/* Day Header: Number and Count */}
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "text-[0.6875rem] sm:text-xs font-mono font-bold",
                      hasTrades ? "text-text-main" : "text-text-muted"
                    )}>
                      {cell.dayNum}
                    </span>

                    {hasTrades && (
                      <span className="text-[0.625rem] font-mono px-1 py-0.2 rounded-full bg-card/80 border border-border-card text-text-muted">
                        {cell.trades.length}t
                      </span>
                    )}
                  </div>

                  {/* Day Result Content */}
                  {hasTrades ? (
                    <div className="mt-1 text-left">
                      <div className={cn(
                        "text-[0.6875rem] sm:text-xs font-bold font-mono tabular-nums leading-tight",
                        isPos ? "text-emerald-500" : isNeg ? "text-rose-500" : "text-amber-500"
                      )}>
                        {metricMode === 'amount'
                          ? formatMoney(cell.netAmount)
                          : `${isPos ? '+' : ''}${cell.netR.toFixed(1)}R`}
                      </div>
                      <div className="text-[0.625rem] font-mono text-text-muted hidden sm:block mt-0.5">
                        {cell.winCount}W / {cell.lossCount}L
                      </div>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Day Expanded Trade Drawer */}
          <AnimatePresence>
            {selectedDayKey && selectedDayTrades.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-[20px] bg-canvas/80 border border-border-card space-y-3 mt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border-card">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-text-main font-mono">
                        Trades on {selectedDayKey} ({selectedDayTrades.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDayKey(null)}
                      className="w-7 h-7 rounded-full bg-card border border-border-card flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {selectedDayTrades.map((trade) => {
                      const isWin = trade.outcome === 'TP';
                      const isLoss = trade.outcome === 'SL';
                      return (
                        <div
                          key={trade.id}
                          onClick={() => onSelectTrade?.(trade)}
                          className="p-3 rounded-[16px] bg-card border border-border-card hover:border-blue-500/40 transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-text-main">{trade.symbol}</span>
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[0.625rem] font-bold uppercase",
                                trade.direction === 'LONG' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                              )}>
                                {trade.direction}
                              </span>
                              <span className="text-[0.625rem] font-mono text-text-muted">
                                {trade.trade_date.substring(11, 16) || ''}
                              </span>
                            </div>
                            <div className="text-[0.6875rem] text-text-muted truncate max-w-[140px] mt-0.5">
                              {trade.account_name || 'Personal'}
                            </div>
                          </div>

                          <div className="text-right font-mono tabular-nums">
                            <div className={cn(
                              "text-xs font-bold",
                              trade.pnl_r > 0 ? "text-emerald-500" : trade.pnl_r < 0 ? "text-rose-500" : "text-amber-500"
                            )}>
                              {trade.pnl_r > 0 ? `+${trade.pnl_r.toFixed(2)}` : trade.pnl_r.toFixed(2)}R
                            </div>
                            {trade.pnl_amount !== null && trade.pnl_amount !== undefined && (
                              <div className="text-[0.625rem] text-text-muted">
                                {formatMoney(trade.pnl_amount)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. SUB-VIEW B: YEARLY & MONTHLY RETURNS MATRIX (MT5 STYLE) */}
      {subView === 'matrix' && (
        <div className="space-y-4">
          {stats.yearlyMatrix.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No historical trade records available for monthly matrix calculation.
            </div>
          ) : (
            <div>
              {/* Desktop Matrix Table (>= md) */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-border-card text-[0.6875rem] uppercase font-semibold text-text-muted">
                      <th className="py-2.5 px-3 text-left">Year</th>
                      {MONTH_SHORT.map((m) => (
                        <th key={m} className="py-2.5 px-2">{m}</th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Year Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card text-xs font-mono">
                    {stats.yearlyMatrix.map((y) => {
                      const isYearPos = y.totalR > 0;
                      const isYearNeg = y.totalR < 0;

                      return (
                        <tr key={y.year} className="hover:bg-canvas/60 transition-colors">
                          <td className="py-3 px-3 text-left font-bold text-text-main">
                            {y.year}
                          </td>

                          {MONTH_SHORT.map((_, moIdx) => {
                            const monthData = y.months[moIdx];
                            if (!monthData || monthData.tradesCount === 0) {
                              return (
                                <td key={moIdx} className="py-2 px-1 text-text-muted/40">
                                  —
                                </td>
                              );
                            }

                            const isPos = monthData.netR > 0;
                            const isNeg = monthData.netR < 0;

                            return (
                              <td key={moIdx} className="py-2 px-1">
                                <div className={cn(
                                  "p-1.5 rounded-[10px] text-[0.6875rem] font-bold tabular-nums",
                                  isPos ? "bg-emerald-500/10 text-emerald-500" :
                                  isNeg ? "bg-rose-500/10 text-rose-500" : "bg-canvas text-text-muted"
                                )}>
                                  <div>
                                    {metricMode === 'amount'
                                      ? formatMoney(monthData.netAmount)
                                      : `${isPos ? '+' : ''}${monthData.netR.toFixed(1)}R`}
                                  </div>
                                  <div className="text-[0.5625rem] text-text-muted font-normal mt-0.5">
                                    {monthData.tradesCount}t
                                  </div>
                                </div>
                              </td>
                            );
                          })}

                          <td className="py-3 px-3 text-right">
                            <span className={cn(
                              "font-bold text-xs",
                              isYearPos ? "text-emerald-500" : isYearNeg ? "text-rose-500" : "text-text-main"
                            )}>
                              {metricMode === 'amount'
                                ? formatMoney(y.totalAmount)
                                : `${isYearPos ? '+' : ''}${y.totalR.toFixed(2)} R`}
                            </span>
                            <span className="text-[0.625rem] text-text-muted block font-normal">
                              {y.totalTrades}t ({y.winRate}% WR)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Monthly Matrix Cards (< md) per design.md §9 (no horizontal scroll) */}
              <div className="space-y-4 md:hidden">
                {stats.yearlyMatrix.map((y) => {
                  const isYearPos = y.totalR > 0;
                  const isYearNeg = y.totalR < 0;

                  return (
                    <div
                      key={y.year}
                      className="p-4 rounded-[20px] bg-canvas/60 border border-border-card space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border-card pb-2">
                        <span className="text-sm font-bold text-text-main font-mono">{y.year}</span>
                        <div className="text-right font-mono">
                          <span className={cn(
                            "text-xs font-bold",
                            isYearPos ? "text-emerald-500" : isYearNeg ? "text-rose-500" : "text-text-main"
                          )}>
                            {metricMode === 'amount' ? formatMoney(y.totalAmount) : `${isYearPos ? '+' : ''}${y.totalR.toFixed(2)} R`}
                          </span>
                          <span className="text-[0.625rem] text-text-muted block">
                            {y.totalTrades} trades • {y.winRate}% WR
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {MONTH_SHORT.map((m, moIdx) => {
                          const monthData = y.months[moIdx];
                          const hasData = Boolean(monthData && monthData.tradesCount > 0);
                          const isPos = hasData && monthData.netR > 0;
                          const isNeg = hasData && monthData.netR < 0;

                          return (
                            <div
                              key={m}
                              className={cn(
                                "p-2 rounded-[14px] text-center border",
                                hasData
                                  ? isPos
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                    : isNeg
                                    ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                    : "bg-card border-border-card text-text-muted"
                                  : "bg-canvas/40 border-border-card/40 text-text-muted/40"
                              )}
                            >
                              <span className="text-[0.6875rem] font-semibold block text-text-muted">{m}</span>
                              <span className="text-xs font-bold font-mono block mt-0.5">
                                {hasData
                                  ? metricMode === 'amount'
                                    ? formatMoney(monthData.netAmount)
                                    : `${isPos ? '+' : ''}${monthData.netR.toFixed(1)}R`
                                  : '—'}
                              </span>
                              {hasData && (
                                <span className="text-[0.5625rem] text-text-muted block font-mono">
                                  {monthData.tradesCount}t
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
