import React from 'react';
import { cn } from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';
import { Sparkline } from './common/Sparkline';
import { formatCurrency, formatCompactCurrency } from './common/formatters';

export function EquitySparklineWidget({ 
  size, 
  account, 
  accounts = [],
  stats, 
  currencySymbol = '$' 
}: WidgetProps) {
  const totalAccountsBalance = accounts.reduce(
    (sum, a) => sum + Number(a.initial_balance ?? a.balance ?? 0),
    0
  );

  const initialBalance = account 
    ? Number(account.initial_balance ?? account.balance ?? 0)
    : totalAccountsBalance;

  const netPnlAmount = stats?.netAmount ?? 0;
  const currentBalance = initialBalance + netPnlAmount;
  const netPnlPercent = initialBalance > 0 ? (netPnlAmount / initialBalance) * 100 : 0;
  const isPositive = netPnlAmount >= 0;

  // Extract points for sparkline from equity curve
  const points = stats?.equityCurve && stats.equityCurve.length >= 2
    ? stats.equityCurve.map(p => p.totalBalance ?? initialBalance)
    : [initialBalance, currentBalance];

  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between text-left">
        <div className="flex items-center justify-between">
          <span className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold">
            Equity
          </span>
          <span className={cn(
            "text-[0.6875rem] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? '+' : ''}{netPnlPercent.toFixed(1)}%
          </span>
        </div>
        
        <div className="my-auto">
          <div className="text-xl font-bold tabular-nums text-text-main tracking-tight">
            {formatCompactCurrency(currentBalance, currencySymbol)}
          </div>
          <div className={cn(
            "text-xs font-semibold tabular-nums mt-0.5 flex items-center gap-0.5",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatCurrency(netPnlAmount, currencySymbol)}
          </div>
        </div>

        <div className="h-6 w-full mt-1">
          <Sparkline points={points} isPositive={isPositive} height={24} width={100} />
        </div>
      </WidgetCard>
    );
  }

  if (size === 'medium') {
    return (
      <WidgetCard title="Equity Curve" size={size}>
        <div className="flex items-center justify-between flex-1 gap-4 h-full">
          <div className="shrink-0">
            <div className="text-2xl font-bold tabular-nums text-text-main tracking-tight">
              {formatCurrency(currentBalance, currencySymbol)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
                isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {isPositive ? '+' : ''}{formatCurrency(netPnlAmount, currencySymbol)} ({isPositive ? '+' : ''}{netPnlPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="flex-1 h-full bg-canvas/40 rounded-[14px] p-2 flex items-center justify-center border border-border-card">
            <Sparkline points={points} isPositive={isPositive} height={50} width={160} fill />
          </div>
        </div>
      </WidgetCard>
    );
  }

  // Large (2x2) size
  return (
    <WidgetCard title="Equity Curve" size={size}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2 shrink-0">
        <div>
          <span className="text-3xl font-bold tabular-nums text-text-main tracking-tight">
            {formatCurrency(currentBalance, currencySymbol)}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full flex items-center gap-1",
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {isPositive ? '+' : ''}{formatCurrency(netPnlAmount, currencySymbol)} ({isPositive ? '+' : ''}{netPnlPercent.toFixed(2)}%)
            </span>
            {account ? (
              <span className="text-xs text-text-muted">
                {account.name}
              </span>
            ) : accounts.length > 0 ? (
              <span className="text-xs text-text-muted">
                All Accounts ({accounts.length})
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">Net Return (R)</div>
          <div className={cn(
            "text-base font-bold tabular-nums font-mono",
            (stats?.netR ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {(stats?.netR ?? 0) >= 0 ? '+' : ''}{(stats?.netR ?? 0).toFixed(1)}R
          </div>
        </div>
      </div>

      <div className="flex-1 w-full bg-canvas/30 rounded-[14px] p-3 border border-border-card flex flex-col justify-between relative overflow-hidden min-h-[140px]">
        <div className="absolute inset-x-0 top-1/4 border-b border-border-card/40 pointer-events-none" />
        <div className="absolute inset-x-0 top-2/4 border-b border-border-card/40 pointer-events-none" />
        <div className="absolute inset-x-0 top-3/4 border-b border-border-card/40 pointer-events-none" />

        <div className="flex-1 w-full h-full relative z-10">
          <Sparkline points={points} isPositive={isPositive} height={120} width={340} fill />
        </div>

        <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono mt-2 pt-2 border-t border-border-card/40 z-10 shrink-0">
          <span>Trades: {stats?.totalTrades ?? points.length}</span>
          <span>Max DD: {(stats?.maxDrawdownPercent ?? 0).toFixed(1)}%</span>
          <span>Profit Factor: {(stats?.profitFactorAmount ?? stats?.profitFactorR ?? 1).toFixed(2)}</span>
        </div>
      </div>
    </WidgetCard>
  );
}

