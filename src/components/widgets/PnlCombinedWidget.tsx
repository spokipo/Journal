import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';
import { formatCurrency } from './common/formatters';

export function PnlCombinedWidget({ 
  size, 
  stats, 
  account, 
  accounts = [],
  currencySymbol = '$' 
}: WidgetProps) {
  const totalAccountsBalance = accounts.reduce(
    (sum, a) => sum + Number(a.initial_balance ?? a.balance ?? 0),
    0
  );

  const initialBalance = account 
    ? Number(account.initial_balance ?? account.balance ?? 0)
    : totalAccountsBalance;

  const netAmount = stats?.netAmount ?? 0;
  const netPercent = initialBalance > 0 ? (netAmount / initialBalance) * 100 : 0;
  const isPositive = netAmount >= 0;

  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            {isPositive ? (
              <TrendingUp size={14} className="text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown size={14} className="text-rose-500 shrink-0" />
            )}
            <span>Net PnL</span>
          </div>
          <span className={cn(
            "text-[0.6875rem] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? '+' : ''}{netPercent.toFixed(1)}%
          </span>
        </div>

        <div className="my-auto">
          <div className={cn(
            "text-xl font-bold tabular-nums tracking-tight",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {formatCurrency(netAmount, currencySymbol)}
          </div>
          <div className="text-xs text-text-muted mt-0.5 font-mono">
            {stats?.totalTrades ?? 0} trades
          </div>
        </div>

        <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono pt-1 border-t border-border-card/40">
          <span>Total Net R</span>
          <span className={cn("font-bold", (stats?.netR ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {(stats?.netR ?? 0) >= 0 ? '+' : ''}{(stats?.netR ?? 0).toFixed(1)}R
          </span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Net PnL Performance" size={size}>
      <div className="flex items-center justify-between flex-1 gap-4 h-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold tabular-nums tracking-tight",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              {formatCurrency(netAmount, currencySymbol)}
            </span>
            <span className={cn(
              "text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isPositive ? '+' : ''}{netPercent.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
            <span>Win: <span className="text-emerald-500 font-semibold font-mono">{formatCurrency(stats?.grossWinAmount ?? 0, currencySymbol)}</span></span>
            <span>•</span>
            <span>Loss: <span className="text-rose-500 font-semibold font-mono">{formatCurrency(stats?.grossLossAmount ?? 0, currencySymbol)}</span></span>
          </div>
        </div>

        <div className="w-36 bg-canvas rounded-[14px] p-2.5 flex flex-col justify-center text-right shrink-0 h-full">
          <div className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">Total Net R</div>
          <div className={cn(
            "text-xl font-bold font-mono tabular-nums mt-0.5",
            (stats?.netR ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {(stats?.netR ?? 0) >= 0 ? '+' : ''}{(stats?.netR ?? 0).toFixed(1)}R
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono mt-0.5">
            {stats?.totalTrades ?? 0} trades
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

