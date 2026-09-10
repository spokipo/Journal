import React from 'react';
import { cn } from '../../lib/utils';
import { Zap } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function WinRateWidget({ size, stats }: WidgetProps) {
  const winRate = stats?.winRate ?? 0;
  const wins = stats?.winCount ?? 0;
  const losses = stats?.lossCount ?? 0;
  const total = stats?.totalTrades ?? 0;
  const isHigh = winRate >= 50;

  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between items-center text-center">
        <div className="w-full flex justify-center pt-1">
          <div className={cn(
            "p-1.5 rounded-full shrink-0",
            isHigh ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <Zap size={22} />
          </div>
        </div>
        <div className="my-auto">
          <div className="text-2xl font-bold tabular-nums text-text-main">
            {winRate.toFixed(0)}%
          </div>
          <div className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold mt-0.5">
            Win Rate
          </div>
        </div>
        <div className="text-[0.6875rem] text-text-muted font-mono">
          {wins}W - {losses}L
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Win Rate & Edge" size={size}>
      <div className="flex items-end justify-between flex-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-text-main">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-text-muted">({total} trades)</span>
          </div>
          <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
            <span className="text-emerald-500 font-semibold">{wins} Wins</span>
            <span>•</span>
            <span className="text-rose-500 font-semibold">{losses} Losses</span>
            {Boolean(stats?.beCount) && (
              <>
                <span>•</span>
                <span className="text-blue-500 font-semibold">{stats?.beCount} BE</span>
              </>
            )}
          </div>
        </div>
        <div className="h-10 w-10 rounded-[18px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
          <Zap size={20} />
        </div>
      </div>
      <div className="w-full bg-canvas rounded-full h-2 mt-4 overflow-hidden shrink-0 flex">
        <div 
          className="bg-emerald-500 h-full transition-all" 
          style={{ width: `${winRate}%` }} 
        />
        <div 
          className="bg-rose-500 h-full transition-all" 
          style={{ width: `${100 - winRate}%` }} 
        />
      </div>
    </WidgetCard>
  );
}

