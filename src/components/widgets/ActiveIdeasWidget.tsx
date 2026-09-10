import React from 'react';
import { cn } from '../../lib/utils';
import { Lightbulb, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function ActiveIdeasWidget({ size, ideas = [], onOpenTradeModal }: WidgetProps) {
  const activeIdeas = ideas.filter((i: any) => {
    const s = String(i.status || '').toLowerCase();
    if (s === 'executed' || s === 'invalidated' || s === 'cancelled') return false;
    if (i.expires_at && new Date(i.expires_at).getTime() <= Date.now()) return false;
    return true;
  });

  const latestIdea = activeIdeas[0];

  const formatIdeaLocalTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return isToday ? `Today ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  };

  if (size === 'small') {
    if (!latestIdea) {
      return (
        <WidgetCard size={size} className="justify-between items-center text-center p-3.5">
          <div className="w-full flex justify-center pt-0.5">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 shrink-0">
              <Lightbulb size={22} />
            </div>
          </div>
          <div className="my-auto">
            <div className="text-xl font-bold text-text-main">No Ideas</div>
            <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mt-0.5">
              Active Radar
            </div>
          </div>
          <div className="text-xs text-text-muted font-mono font-medium">0 Active</div>
        </WidgetCard>
      );
    }

    const isLong = latestIdea.direction === 'LONG';

    return (
      <WidgetCard size={size} className="justify-between text-left p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-bold text-text-main font-mono tracking-tight">
              {latestIdea.symbol}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
              isLong 
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            )}>
              {latestIdea.direction}
            </span>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/40" />
        </div>

        <div className="my-auto py-0.5">
          <div className="text-xs font-medium text-text-muted line-clamp-1">
            {latestIdea.notes || 'Active trade setup'}
          </div>
          <div className="text-sm font-mono font-bold text-text-main mt-0.5 flex items-center justify-between">
            <span>{latestIdea.entry_price ? `Entry: ${latestIdea.entry_price}` : 'Active Plan'}</span>
            <span className="text-xs text-text-muted font-normal">{formatIdeaLocalTime(latestIdea.created_at)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTradeModal?.(latestIdea);
          }}
          className="w-full h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Execute Trade</span>
        </button>
      </WidgetCard>
    );
  }

  // Medium (2x1) & Large (2x2)
  return (
    <WidgetCard 
      title={`Active Ideas (${activeIdeas.length})`} 
      size={size}
    >
      {activeIdeas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
          <div className="p-2 rounded-full bg-canvas border border-border-card text-text-muted mb-2">
            <Lightbulb size={22} />
          </div>
          <div className="text-sm font-bold text-text-main">No active trading ideas</div>
          <div className="text-xs text-text-muted mt-0.5">Save ideas in Ideas tab to convert directly into trades</div>
        </div>
      ) : (
        <div className={cn(
          "flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1",
          size === 'large' ? "max-h-[340px]" : "max-h-[110px]"
        )}>
          {activeIdeas.map((idea: any) => {
            const isLong = idea.direction === 'LONG';
            return (
              <div 
                key={idea.id || idea.symbol}
                className="flex items-center justify-between px-3 py-2.5 rounded-[16px] bg-canvas border border-border-card hover:border-blue-500/40 transition-colors gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 font-bold text-xs border",
                    isLong 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}>
                    {isLong ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-main font-mono tracking-tight">{idea.symbol}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
                        isLong 
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      )}>
                        {idea.direction}
                      </span>
                      <span className="text-xs text-text-muted font-mono font-medium">
                        {formatIdeaLocalTime(idea.created_at)}
                      </span>
                    </div>
                    {idea.notes && (
                      <p className="text-xs font-medium text-text-muted truncate max-w-[240px] mt-0.5">
                        {idea.notes}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTradeModal?.(idea);
                  }}
                  className="h-8 px-3.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Trade</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}

