import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Activity, SlidersHorizontal, Check, X } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function DailyRiskWidget({ 
  size, 
  todayTrades = [], 
  dailyRiskLimit = 2.0, 
  onUpdateDailyRiskLimit 
}: WidgetProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [inputVal, setInputVal] = useState<string>(String(dailyRiskLimit));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastClosedAtRef = useRef<number>(0);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const handleCloseConfig = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    lastClosedAtRef.current = Date.now();
    setIsConfigOpen(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Date.now() - lastClosedAtRef.current < 400) return;
    if (isConfigOpen) {
      handleCloseConfig();
    } else {
      setIsConfigOpen(true);
    }
  };

  useEffect(() => {
    setInputVal(String(dailyRiskLimit));
  }, [dailyRiskLimit]);

  // Format risk number with flexible decimals (e.g. 1.0, 0.5, 0.25)
  const formatRiskVal = (val: number) => {
    if (!val && val !== 0) return '0.0';
    const rounded = Math.round(val * 100) / 100;
    return rounded % 1 === 0 ? rounded.toFixed(1) : rounded.toString();
  };

  // Sum risk percentage of trades taken today
  const effectiveLimit = Math.max(0.01, dailyRiskLimit);
  const todayRiskUsed = todayTrades.reduce((sum, t) => sum + (Number(t.risk_percent) || 0), 0);
  const percentOfLimit = Math.min(100, Math.round((todayRiskUsed / effectiveLimit) * 100));

  const isOverLimit = todayRiskUsed >= effectiveLimit;
  const isWarning = todayRiskUsed >= effectiveLimit * 0.75;
  const statusColor = isOverLimit ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-blue-500';
  const progressBg = isOverLimit ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500';

  // Compute position for anchored popover
  useEffect(() => {
    if (!isConfigOpen || !triggerRef.current) return;

    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 220 && rect.top > 220;

      let left = rect.right - popoverWidth;
      if (left < 12) left = 12;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }

      if (openUpwards) {
        setCoords({
          bottom: window.innerHeight - rect.top + 6,
          left,
          width: popoverWidth,
        });
      } else {
        setCoords({
          top: rect.bottom + 6,
          left,
          width: popoverWidth,
        });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [isConfigOpen]);

  const handleSave = () => {
    const cleaned = inputVal.replace(',', '.').trim();
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      onUpdateDailyRiskLimit?.(parsed);
      setIsConfigOpen(false);
    }
  };

  return (
    <div className="w-full h-full relative select-none">
      {size === 'small' ? (
        <WidgetCard size={size} className="justify-between text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
              <Activity size={14} className={statusColor} />
              <span>Daily Risk</span>
            </div>
            <button
              ref={triggerRef}
              type="button"
              onClick={handleTriggerClick}
              title="Configure risk limit"
              className={cn(
                "w-8 h-8 rounded-full bg-canvas border border-border-card flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95",
                isConfigOpen ? "border-blue-500 text-blue-500" : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          <div className="my-auto">
            <div className={cn("text-xl font-bold tabular-nums tracking-tight", statusColor)}>
              {formatRiskVal(todayRiskUsed)}%
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              Limit: <span className="font-mono font-semibold text-text-main">{formatRiskVal(effectiveLimit)}%</span>
            </div>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono mb-1">
              <span>{percentOfLimit}% used</span>
              <span>{formatRiskVal(Math.max(0, effectiveLimit - todayRiskUsed))}% left</span>
            </div>
            <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-300", progressBg)} 
                style={{ width: `${percentOfLimit}%` }} 
              />
            </div>
          </div>
        </WidgetCard>
      ) : (
        <WidgetCard 
          title="Daily Risk Allocation" 
          size={size}
          action={
            <button
              ref={triggerRef}
              type="button"
              onClick={handleTriggerClick}
              title="Configure risk limit"
              className={cn(
                "w-8 h-8 rounded-full bg-canvas border border-border-card flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95",
                isConfigOpen ? "border-blue-500 text-blue-500" : "text-text-muted hover:text-text-main hover:bg-card"
              )}
            >
              <SlidersHorizontal size={14} />
            </button>
          }
        >
          <div className="flex items-center justify-between gap-4 flex-1 h-full">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold tabular-nums tracking-tight", statusColor)}>
                  {formatRiskVal(todayRiskUsed)}%
                </span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  isOverLimit ? "bg-rose-500/10 text-rose-500" : isWarning ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {isOverLimit ? 'Limit Exceeded' : isWarning ? 'High Risk' : 'Healthy Range'}
                </span>
              </div>
              <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
                <span>Limit: <span className="font-mono text-text-main font-semibold">{formatRiskVal(effectiveLimit)}%</span></span>
                <span>•</span>
                <span>Available: <span className={cn("font-mono font-bold", statusColor)}>
                  {formatRiskVal(Math.max(0, effectiveLimit - todayRiskUsed))}%
                </span></span>
              </div>
            </div>

            <div className="w-48 bg-canvas rounded-[14px] p-2.5 flex flex-col justify-between shrink-0 h-full">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">Daily Budget</span>
                <span className="font-bold font-mono text-text-main">{percentOfLimit}%</span>
              </div>
              <div className="w-full bg-card rounded-full h-1.5 overflow-hidden my-1">
                <div 
                  className={cn("h-full rounded-full transition-all duration-300", progressBg)} 
                  style={{ width: `${percentOfLimit}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono">
                <span>{todayTrades.length} trades</span>
                <span>Max: {formatRiskVal(effectiveLimit)}%</span>
              </div>
            </div>
          </div>
        </WidgetCard>
      )}

      {/* ANCHORED CONTEXT MENU / POPOVER FOR CONFIGURATION PER DESIGN.MD §3 A & §5 */}
      {isConfigOpen && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onPointerDown={handleCloseConfig}
            onClick={handleCloseConfig}
          />
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="fixed z-50 bg-card border border-border-card rounded-[18px] p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-border-card/40">
              <span className="text-xs font-semibold text-text-main">Set Daily Risk Limit</span>
              <button
                type="button"
                onClick={handleCloseConfig}
                className="w-7 h-7 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                inputMode="decimal"
                value={inputVal}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
                    setInputVal(v);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="e.g. 0.5"
                className="w-full h-9 text-center text-base font-bold font-mono text-text-main bg-canvas border border-border-card rounded-full focus:outline-none focus:border-blue-500 tabular-nums px-3"
                autoFocus
              />
              <span className="font-bold text-text-muted font-mono text-sm">%</span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full h-9 rounded-full bg-blue-500 border border-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check size={14} />
              <span>Apply Limit</span>
            </button>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

