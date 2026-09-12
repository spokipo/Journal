import React from 'react';
import { cn } from '../../lib/utils';
import { Award, BarChart2 } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function ProfitFactorWidget({ size, stats }: WidgetProps) {
  const pf = stats?.profitFactorAmount ?? 1.5;
  const expectancy = stats?.expectancyR ?? 0.5;
  const isHealthy = pf >= 1.5;

  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Award size={14} className={isHealthy ? "text-emerald-500" : "text-amber-500"} />
            <span>Profit Factor</span>
          </div>
          <span className={cn(
            "text-[0.6875rem] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
            isHealthy ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            {isHealthy ? 'Strong' : 'Mod.'}
          </span>
        </div>

        <div className="my-auto">
          <div className="text-xl font-bold tabular-nums text-text-main tracking-tight">
            {pf.toFixed(2)}
          </div>
          <div className={cn(
            "text-xs font-mono font-bold mt-0.5",
            expectancy >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R exp
          </div>
        </div>

        <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono pt-1 border-t border-border-card/40">
          <span>Target PF</span>
          <span>≥ 1.50</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Profit Factor & Expectancy" size={size}>
      <div className="flex items-center justify-between gap-4 flex-1 h-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-text-main tracking-tight">
              {pf.toFixed(2)}
            </span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isHealthy ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {isHealthy ? 'Healthy Profit Factor' : 'Moderate Ratio'}
            </span>
          </div>
          <div className="text-xs text-text-muted mt-1.5">
            Avg Expectancy: <span className={cn("font-mono font-bold", expectancy >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R
            </span> per trade
          </div>
        </div>

        <div className="w-40 bg-canvas rounded-[14px] p-2.5 flex flex-col justify-between shrink-0 h-full text-right">
          <div className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">Trade Quality</div>
          <div className={cn("text-base font-bold font-mono", isHealthy ? "text-emerald-500" : "text-amber-500")}>
            {isHealthy ? 'High Edge' : 'Refine Risk'}
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono">
            {expectancy > 0 ? 'Positive Edge' : 'Negative Edge'}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

