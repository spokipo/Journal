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
      <WidgetCard size={size} className="justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Zap size={14} className={isHigh ? "text-emerald-500" : "text-amber-500"} />
            <span>Win Rate</span>
          </div>
          <span className={cn(
            "text-[0.6875rem] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
            isHigh ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            {total} trades
          </span>
        </div>

        <div className="my-auto">
          <div className="text-xl font-bold tabular-nums text-text-main tracking-tight">
            {winRate.toFixed(0)}%
          </div>
          <div className="text-xs text-text-muted mt-0.5 font-mono">
            {wins}W — {losses}L{Boolean(stats?.beCount) ? ` — ${stats?.beCount}BE` : ''}
          </div>
        </div>

        <div className="w-full">
          <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300" 
              style={{ width: `${winRate}%` }} 
            />
            <div 
              className="bg-rose-500 h-full transition-all duration-300" 
              style={{ width: `${100 - winRate}%` }} 
            />
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Win Rate & Consistency" size={size}>
      <div className="flex items-center justify-between gap-4 flex-1 h-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-text-main tracking-tight">
              {winRate.toFixed(1)}%
            </span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isHigh ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {isHigh ? 'Profitable Edge' : 'Needs Optimization'}
            </span>
          </div>
          <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2 font-mono">
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

        <div className="w-44 bg-canvas rounded-[14px] p-2.5 flex flex-col justify-between shrink-0 h-full">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted font-medium">Distribution</span>
            <span className="text-[0.6875rem] font-mono text-text-muted font-medium">{total} total</span>
          </div>
          <div className="w-full bg-card rounded-full h-1.5 overflow-hidden flex my-1">
            <div 
              className="bg-emerald-500 h-full transition-all" 
              style={{ width: `${winRate}%` }} 
            />
            <div 
              className="bg-rose-500 h-full transition-all" 
              style={{ width: `${100 - winRate}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[0.6875rem] font-mono">
            <span className="text-emerald-500 font-bold">{winRate.toFixed(0)}% W</span>
            <span className="text-rose-500 font-bold">{(100 - winRate).toFixed(0)}% L</span>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

