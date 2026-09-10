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
      <WidgetCard size={size} className="justify-between items-center text-center">
        <div className="w-full flex justify-center pt-1">
          <div className={cn(
            "p-1.5 rounded-full shrink-0",
            isHealthy ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <Award size={22} />
          </div>
        </div>
        <div className="my-auto">
          <div className="text-2xl font-bold tabular-nums text-text-main">
            {pf.toFixed(2)}
          </div>
          <div className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold mt-0.5">
            Profit Factor
          </div>
        </div>
        <div className="text-[0.6875rem] text-emerald-500 font-mono">
          {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R exp
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Profit Factor" size={size}>
      <div className="flex items-end justify-between flex-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-text-main">
              {pf.toFixed(2)}
            </span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isHealthy ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {isHealthy ? 'Strong Edge' : 'Moderate'}
            </span>
          </div>
          <div className="text-xs text-text-muted mt-1.5">
            Avg Expectancy: <span className="font-mono text-text-main font-semibold">{expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R</span> per trade
          </div>
        </div>
        <div className="h-10 w-10 rounded-[18px] bg-canvas flex items-center justify-center text-blue-500 shrink-0">
          <BarChart2 size={20} />
        </div>
      </div>
    </WidgetCard>
  );
}

