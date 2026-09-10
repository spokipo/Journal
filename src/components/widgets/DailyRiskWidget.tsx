import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Activity, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function DailyRiskWidget({ 
  size, 
  todayTrades = [], 
  dailyRiskLimit = 2.0, 
  onUpdateDailyRiskLimit 
}: WidgetProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tempLimit, setTempLimit] = useState(dailyRiskLimit);

  useEffect(() => {
    setTempLimit(dailyRiskLimit);
  }, [dailyRiskLimit]);

  // Sum risk percentage of trades taken today
  const effectiveLimit = Math.max(0.1, dailyRiskLimit);
  const todayRiskUsed = todayTrades.reduce((sum, t) => sum + (Number(t.risk_percent) || 0), 0);
  const percentOfLimit = Math.min(100, Math.round((todayRiskUsed / effectiveLimit) * 100));

  const isOverLimit = todayRiskUsed >= effectiveLimit;
  const isWarning = todayRiskUsed >= effectiveLimit * 0.75;
  const statusColor = isOverLimit ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-blue-500';
  const progressBg = isOverLimit ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500';

  const handleSave = (val: number) => {
    onUpdateDailyRiskLimit?.(val);
    setIsFlipped(false);
  };

  return (
    <div className="w-full h-full relative select-none" style={{ perspective: 1000 }}>
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
        onAnimationStart={() => setIsAnimating(true)}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        {/* FRONT CARD */}
        <div
          className={cn(
            "w-full h-full",
            isFlipped ? "pointer-events-none" : "pointer-events-auto"
          )}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {size === 'small' ? (
            <WidgetCard size={size} className="justify-between items-center text-center relative">
              <div className="w-full flex justify-between items-center pt-0.5 px-0.5">
                <span className="w-8" />
                <div className={cn("p-2 rounded-full bg-canvas shrink-0", statusColor)}>
                  <Activity size={20} />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  title="Configure daily risk limit"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              <div className="my-auto">
                <div className={cn("text-2xl font-bold tabular-nums", statusColor)}>
                  {todayRiskUsed.toFixed(1)}%
                </div>
                <div className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold mt-0.5">
                  Limit: {effectiveLimit.toFixed(1)}%
                </div>
              </div>

              <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-300", progressBg)} 
                  style={{ width: `${percentOfLimit}%` }} 
                />
              </div>
            </WidgetCard>
          ) : (
            <WidgetCard size={size}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-text-muted font-medium text-sm">Daily Risk</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="h-8 px-3 rounded-full bg-canvas border border-border-card text-xs font-semibold text-text-muted hover:text-text-main transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <SlidersHorizontal size={13} />
                  <span>Limit: {effectiveLimit.toFixed(1)}%</span>
                </button>
              </div>

              <div className="flex items-end justify-between flex-1">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-3xl font-bold tabular-nums", statusColor)}>
                      {todayRiskUsed.toFixed(1)}%
                    </span>
                    <span className="text-xs text-text-muted font-medium">
                      used today
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-1.5">
                    Limit: <span className="font-mono text-text-main font-semibold">{effectiveLimit.toFixed(1)}%</span> • Left: <span className={cn("font-mono font-semibold", statusColor)}>
                      {Math.max(0, effectiveLimit - todayRiskUsed).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={cn("h-10 w-10 rounded-[18px] bg-canvas flex items-center justify-center shrink-0", statusColor)}>
                  <Activity size={20} />
                </div>
              </div>
              <div className="w-full bg-canvas rounded-full h-2 mt-4 overflow-hidden shrink-0">
                <div 
                  className={cn("h-full rounded-full transition-all duration-300", progressBg)} 
                  style={{ width: `${percentOfLimit}%` }} 
                />
              </div>
            </WidgetCard>
          )}
        </div>

        {/* BACK CARD (FLIPPED 180 DEG) */}
        <div
          className={cn(
            "w-full h-full absolute inset-0",
            !isFlipped ? "pointer-events-none" : "pointer-events-auto"
          )}
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <WidgetCard size={size} className="justify-between">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-text-main">Daily Risk Limit</span>
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="my-auto flex items-center justify-center py-2">
              <div className="relative flex items-center justify-center">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="20"
                  value={tempLimit}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setTempLimit(val);
                  }}
                  className="w-24 h-11 text-center text-2xl font-bold font-mono text-text-main bg-canvas border border-border-card rounded-[18px] focus:outline-none focus:border-blue-500 tabular-nums px-2"
                />
                <span className="ml-2 text-xl font-bold text-text-muted font-mono">%</span>
              </div>
            </div>

            <div className="w-full shrink-0">
              <button
                type="button"
                onClick={() => handleSave(tempLimit)}
                className="w-full h-10 rounded-[18px] bg-blue-500 text-white hover:bg-blue-600 text-sm font-semibold transition-all shadow-sm cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                <span>Apply</span>
              </button>
            </div>
          </WidgetCard>
        </div>
      </motion.div>
    </div>
  );
}

