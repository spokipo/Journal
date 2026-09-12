import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Lightbulb, Plus, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';
import { formatIdeaRemainingTime } from '../journal/types';

export function ActiveIdeasWidget({ size, ideas = [], onOpenTradeModal }: WidgetProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeIdeas = ideas.filter((i: any) => {
    const s = String(i.status || '').toLowerCase();
    if (s === 'executed' || s === 'invalidated' || s === 'cancelled') return false;
    if (i.expires_at && new Date(i.expires_at).getTime() <= now) return false;
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
        <WidgetCard size={size} className="justify-between text-left">
          <div className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Lightbulb size={14} className="text-amber-500 shrink-0" />
            <span>Active Radar</span>
          </div>

          <div className="my-auto">
            <div className="text-xl font-bold text-text-main truncate">
              No Ideas
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              0 active trade plans
            </div>
          </div>

          <div className="text-[0.6875rem] text-text-muted font-mono">
            —
          </div>
        </WidgetCard>
      );
    }

    const isLong = latestIdea.direction === 'LONG';

    return (
      <WidgetCard size={size} className="justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Lightbulb size={14} className="text-amber-500 shrink-0" />
            <span>Active Radar</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/40" />
        </div>

        <div className="my-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-text-main font-mono tracking-tight">
              {latestIdea.symbol}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase",
              isLong 
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            )}>
              {latestIdea.direction}
            </span>
          </div>
          <div className="text-xs text-text-muted font-mono mt-0.5 flex items-center justify-between">
            <span>{latestIdea.entry_price ? `Entry: ${latestIdea.entry_price}` : 'Market Plan'}</span>
            {latestIdea.expires_at ? (
              <span className="text-[0.6875rem] font-mono text-amber-500 font-semibold flex items-center gap-1">
                <Clock size={11} className="shrink-0" />
                <span>{formatIdeaRemainingTime(latestIdea.expires_at, now)}</span>
              </span>
            ) : (
              <span className="text-[0.6875rem]">{formatIdeaLocalTime(latestIdea.created_at)}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTradeModal?.(latestIdea);
          }}
          className="w-full h-7 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={13} />
          <span>Execute Trade</span>
        </button>
      </WidgetCard>
    );
  }

  // Medium (2x1): Exactly 2 list rows without internal scroll
  if (size === 'medium') {
    const displayed = activeIdeas.slice(0, 2);
    return (
      <WidgetCard title={`Active Ideas (${activeIdeas.length})`} size={size}>
        {displayed.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Lightbulb size={20} className="text-amber-500/40 mb-1" />
            <div className="text-sm font-semibold text-text-main">No active trading ideas</div>
            <div className="text-xs text-text-muted mt-0.5">Save ideas in Ideas tab to convert into trades</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 flex-1 justify-between">
            {displayed.map((idea: any) => {
              const isLong = idea.direction === 'LONG';
              return (
                <div 
                  key={idea.id || idea.symbol}
                  className="flex items-center justify-between px-3 py-2 rounded-[14px] bg-canvas border border-border-card hover:border-blue-500/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 font-bold text-xs border",
                      isLong 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}>
                      {isLong ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-main font-mono tracking-tight">{idea.symbol}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase",
                          isLong 
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        )}>
                          {idea.direction}
                        </span>
                        {idea.expires_at ? (
                          <span className="text-[0.6875rem] font-mono text-amber-500 font-semibold flex items-center gap-1 shrink-0">
                            <Clock size={11} className="shrink-0" />
                            <span>{formatIdeaRemainingTime(idea.expires_at, now)}</span>
                          </span>
                        ) : (
                          <span className="text-[0.6875rem] text-text-muted font-mono">
                            {formatIdeaLocalTime(idea.created_at)}
                          </span>
                        )}
                      </div>
                      {idea.notes && (
                        <p className="text-xs text-text-muted truncate max-w-[260px]">
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
                    className="h-7 px-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={12} />
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

  // Large (2x2): Up to 6-8 rows with internal scroll
  return (
    <WidgetCard title={`Active Ideas (${activeIdeas.length})`} size={size}>
      {activeIdeas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Lightbulb size={24} className="text-amber-500/40 mb-2" />
          <div className="text-base font-semibold text-text-main">No active ideas</div>
          <div className="text-xs text-text-muted mt-1">Save ideas to convert directly into trades</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[340px] pr-1">
          {activeIdeas.slice(0, 8).map((idea: any) => {
            const isLong = idea.direction === 'LONG';
            return (
              <div 
                key={idea.id || idea.symbol}
                className="flex items-center justify-between px-3 py-2.5 rounded-[14px] bg-canvas border border-border-card hover:border-blue-500/40 transition-colors gap-3"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-text-main font-mono tracking-tight">{idea.symbol}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase",
                        isLong 
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      )}>
                        {idea.direction}
                      </span>
                      <span className="text-xs text-text-muted font-mono">
                        {formatIdeaLocalTime(idea.created_at)}
                      </span>
                      {idea.expires_at && (
                        <span className="text-xs font-mono text-amber-500 font-semibold flex items-center gap-1">
                          <Clock size={12} className="shrink-0" />
                          <span>{formatIdeaRemainingTime(idea.expires_at, now)}</span>
                        </span>
                      )}
                    </div>
                    {idea.notes && (
                      <p className="text-xs text-text-muted truncate max-w-[260px] mt-0.5">
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
                  className="h-8 px-3.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shrink-0 flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
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

