import React from 'react';
import { Clock, Trophy, AlertTriangle } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function BestWorstSessionsWidget({ size, stats }: WidgetProps) {
  const sessions = stats?.bySession?.filter(s => s.tradesCount > 0) || [];
  const sorted = [...sessions].sort((a, b) => b.netR - a.netR);
  const bestSession = sorted[0];
  const worstSession = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  if (size === 'small') {
    if (!bestSession) {
      return (
        <WidgetCard size={size} className="justify-between items-center text-center">
          <div className="w-full flex justify-center pt-1">
            <div className="p-1.5 rounded-full bg-canvas text-blue-500 shrink-0">
              <Clock size={22} />
            </div>
          </div>
          <div className="my-auto">
            <div className="text-xl font-bold text-text-main">No Sessions</div>
            <div className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold mt-0.5">
              Sessions
            </div>
          </div>
          <div className="text-[0.6875rem] text-text-muted">0 Trades</div>
        </WidgetCard>
      );
    }

    return (
      <WidgetCard size={size} className="justify-between text-left p-3.5">
        <div className="min-w-0">
          <div className="flex items-center justify-between text-[0.6875rem] font-bold uppercase text-emerald-500">
            <span className="flex items-center gap-1"><Trophy size={12} /> Top Session</span>
            <span className="font-mono">{bestSession.winRate.toFixed(0)}% WR</span>
          </div>
          <div className="font-semibold text-xs text-text-main truncate mt-0.5">
            {bestSession.label}
          </div>
          <div className="text-[0.6875rem] font-mono text-emerald-500 font-bold">
            +{bestSession.netR.toFixed(1)}R ({bestSession.tradesCount}t)
          </div>
        </div>

        <div className="w-full border-t border-border-card/50 my-1" />

        <div className="min-w-0">
          <div className="flex items-center justify-between text-[0.6875rem] font-bold uppercase text-rose-500">
            <span className="flex items-center gap-1"><AlertTriangle size={12} /> Low Session</span>
            <span className="font-mono">
              {worstSession ? `${worstSession.winRate.toFixed(0)}% WR` : '—'}
            </span>
          </div>
          <div className="font-semibold text-xs text-text-main truncate mt-0.5">
            {worstSession ? worstSession.label : 'None'}
          </div>
          <div className="text-[0.6875rem] font-mono text-rose-500 font-bold">
            {worstSession ? `${worstSession.netR >= 0 ? '+' : ''}${worstSession.netR.toFixed(1)}R (${worstSession.tradesCount}t)` : 'Single session'}
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Trading Sessions Edge" size={size}>
      {!bestSession ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted">
          No session data found in selected trades
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1 h-full items-stretch">
          <div className="bg-canvas border border-border-card rounded-[18px] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase flex items-center gap-1">
                <Trophy size={12} /> Top Session
              </span>
              <span className="text-xs font-mono font-bold text-emerald-500">
                +{bestSession.netR.toFixed(1)}R
              </span>
            </div>
            <div className="my-1.5">
              <div className="font-semibold text-sm text-text-main truncate">
                {bestSession.label}
              </div>
              <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                <span>{bestSession.tradesCount} Trades</span>
                <span>•</span>
                <span className="font-semibold text-emerald-500">{bestSession.winRate.toFixed(0)}% Win Rate</span>
              </div>
            </div>
            <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${bestSession.winRate}%` }} />
            </div>
          </div>

          <div className="bg-canvas border border-border-card rounded-[18px] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold uppercase flex items-center gap-1">
                <AlertTriangle size={12} /> Low Session
              </span>
              <span className="text-xs font-mono font-bold text-rose-500">
                {worstSession ? `${worstSession.netR >= 0 ? '+' : ''}${worstSession.netR.toFixed(1)}R` : '—'}
              </span>
            </div>
            <div className="my-1.5">
              <div className="font-semibold text-sm text-text-main truncate">
                {worstSession ? worstSession.label : 'None'}
              </div>
              <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                <span>{worstSession ? `${worstSession.tradesCount} Trades` : 'Need >1 session'}</span>
                {worstSession && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-rose-500">{worstSession.winRate.toFixed(0)}% Win Rate</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-rose-500 h-full rounded-full" 
                style={{ width: `${worstSession ? worstSession.winRate : 0}%` }} 
              />
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

