import React from 'react';
import { cn } from '../lib/utils';
import { Activity, Clock, TrendingUp } from 'lucide-react';

export type WidgetSize = 'small' | 'medium' | 'large';

// Common wrapper for widgets
export function WidgetCard({ children, className, title, size }: { children: React.ReactNode, className?: string, title?: string, size: WidgetSize }) {
  return (
    <div className={cn(
      "bg-card border border-border-card rounded-[26px] p-5 flex flex-col shadow-sm h-full w-full overflow-hidden transition-all",
      size === 'small' && "p-4", // smaller padding for small widgets
      className
    )}>
      {title && size !== 'small' && <h3 className="text-text-muted font-medium text-sm mb-3">{title}</h3>}
      <div className="flex-1 flex flex-col w-full h-full">
        {children}
      </div>
    </div>
  );
}

// 1. Daily Risk Counter
export function DailyRiskWidget({ size }: { size: WidgetSize }) {
  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between items-center text-center">
        <Activity size={24} className="text-red-500 mb-2" />
        <div>
          <div className="text-2xl font-bold text-text-main">1.2%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Risk</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Daily Risk" size={size}>
      <div className="flex items-end justify-between flex-1">
        <div>
          <div className="text-3xl font-semibold text-text-main">1.2%</div>
          <div className="text-xs text-text-muted mt-1">Limit: 2.0%</div>
        </div>
        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
          <Activity size={20} />
        </div>
      </div>
      <div className="w-full bg-canvas rounded-full h-2 mt-4 overflow-hidden shrink-0">
        <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: '60%' }} />
      </div>
    </WidgetCard>
  );
}

// 2. Session Tracker
export function SessionTrackerWidget({ size }: { size: WidgetSize }) {
  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-center items-center text-center">
        <Clock size={24} className="text-blue-500 mb-2" />
        <div className="text-lg font-bold text-text-main">02:45</div>
        <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-semibold">London</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Active Session" size={size}>
      <div className="flex items-center gap-4 flex-1 h-full">
        <div className="h-12 w-12 rounded-[18px] bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
          <Clock size={24} />
        </div>
        <div>
          <div className="text-xl md:text-2xl font-semibold text-text-main">02:45:10</div>
          <div className="text-sm text-text-muted mt-1">London Overlap</div>
        </div>
      </div>
    </WidgetCard>
  );
}

// 3. Equity Sparkline
export function EquitySparklineWidget({ size }: { size: WidgetSize }) {
  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between text-left">
        <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">Equity</div>
        <div className="text-lg font-bold text-text-main">$104k</div>
        <div className="text-xs text-green-500 font-medium">+4.2%</div>
      </WidgetCard>
    );
  }

  if (size === 'medium') {
    return (
      <WidgetCard title="Equity Curve" size={size}>
        <div className="flex items-center justify-between flex-1">
          <div>
            <div className="text-2xl font-bold text-text-main">$104,250</div>
            <div className="text-sm text-green-500 font-medium mt-1">+4.2% Today</div>
          </div>
          <div className="flex-1 max-w-[120px] ml-4 h-full bg-canvas rounded-[12px] flex items-center justify-center text-text-muted border border-border-card border-dashed">
            <TrendingUp size={20} />
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Equity Curve" size={size}>
      <div className="flex items-baseline gap-3 mb-4 shrink-0">
        <span className="text-3xl font-bold text-text-main">$104,250</span>
        <span className="text-sm text-green-500 font-medium px-2 py-1 bg-green-500/10 rounded-lg">+4.2%</span>
      </div>
      <div className="flex-1 w-full bg-canvas rounded-[18px] flex items-center justify-center text-text-muted border border-border-card border-dashed">
        <div className="flex flex-col items-center gap-2">
          <TrendingUp size={32} className="text-text-muted/50" />
          <span className="text-sm font-medium">Detailed Chart View</span>
        </div>
      </div>
    </WidgetCard>
  );
}

// Registry mapped to types
export const WIDGET_REGISTRY = {
  dailyRisk: { component: DailyRiskWidget, name: 'Daily Risk', supportedSizes: ['small', 'medium'] },
  sessionTracker: { component: SessionTrackerWidget, name: 'Session', supportedSizes: ['small', 'medium'] },
  equitySparkline: { component: EquitySparklineWidget, name: 'Equity', supportedSizes: ['small', 'medium', 'large'] },
};
