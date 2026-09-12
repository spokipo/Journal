import React from 'react';
import { Target } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function WorstSetupWidget({ size, stats }: WidgetProps) {
  const setups = stats?.bySetup?.filter(s => s.tradesCount > 0) || [];
  const sorted = [...setups].sort((a, b) => b.netR - a.netR);
  const worstSetup = sorted.length > 1 
    ? sorted[sorted.length - 1] 
    : (sorted.length === 1 && sorted[0].netR < 0 ? sorted[0] : null);

  if (size === 'small') {
    if (!worstSetup) {
      return (
        <WidgetCard size={size} className="justify-between text-left">
          <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Target size={14} className="text-rose-500 shrink-0" />
            <span>Worst Setup</span>
          </div>

          <div className="my-auto">
            <div className="text-xl font-bold text-text-main truncate">
              None
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {sorted.length === 1 ? 'Only 1 setup recorded' : '0 trades with setups'}
            </div>
          </div>

          <div className="text-[0.6875rem] text-text-muted font-mono">
            —
          </div>
        </WidgetCard>
      );
    }

    return (
      <WidgetCard size={size} className="justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Target size={14} className="text-rose-500 shrink-0" />
            <span>Worst Setup</span>
          </div>
          <span className="text-[0.6875rem] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
            {worstSetup.winRate.toFixed(0)}% WR
          </span>
        </div>

        <div className="my-auto">
          <div className="text-xl font-bold text-text-main truncate tracking-tight">
            {worstSetup.label}
          </div>
          <div className="text-xs font-mono font-bold text-rose-500 mt-0.5">
            {worstSetup.netR >= 0 ? '+' : ''}{worstSetup.netR.toFixed(1)}R
          </div>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between text-[0.6875rem] text-text-muted mb-1 font-mono">
            <span>{worstSetup.tradesCount} trades</span>
            <span>{worstSetup.lossTrades}L</span>
          </div>
          <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(0, worstSetup.winRate))}%` }} 
            />
          </div>
        </div>
      </WidgetCard>
    );
  }

  // Medium size
  return (
    <WidgetCard title="Lowest Trading Setup" size={size}>
      {!worstSetup ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Target size={20} className="text-rose-500/40 mb-1" />
          <div className="text-sm font-semibold text-text-main">No Low Setup</div>
          <div className="text-xs text-text-muted mt-0.5">
            {sorted.length === 1 ? 'Requires at least 2 setups to compare' : 'No trades logged with setups'}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 flex-1 h-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
              <Target size={14} className="text-rose-500 shrink-0" />
              <span>Worst Setup</span>
            </div>
            <div className="text-2xl font-bold text-text-main truncate tracking-tight mt-0.5">
              {worstSetup.label}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono font-bold text-rose-500">
                {worstSetup.netR >= 0 ? '+' : ''}{worstSetup.netR.toFixed(1)}R
              </span>
              <span className="text-xs text-text-muted font-mono">
                ({worstSetup.tradesCount} trades)
              </span>
            </div>
          </div>

          <div className="w-48 bg-canvas rounded-[14px] p-3 flex flex-col justify-between shrink-0 h-full">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Win Rate</span>
              <span className="font-bold font-mono text-rose-500">
                {worstSetup.winRate.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-card rounded-full h-1.5 overflow-hidden my-1">
              <div 
                className="bg-rose-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, worstSetup.winRate))}%` }} 
              />
            </div>
            <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono">
              <span>{worstSetup.winTrades} Wins</span>
              <span>{worstSetup.lossTrades} Losses</span>
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
