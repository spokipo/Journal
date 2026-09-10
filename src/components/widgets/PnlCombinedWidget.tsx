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
      <WidgetCard size={size} className="justify-between items-center text-center">
        <div className="w-full flex justify-between items-center pt-1 px-1">
          <span className={cn(
            "text-[0.6875rem] font-bold tabular-nums px-1.5 py-0.5 rounded-full",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? '+' : ''}{netPercent.toFixed(1)}%
          </span>
          <div className={cn(
            "p-1.5 rounded-full bg-canvas shrink-0",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
        </div>

        <div className="my-auto">
          <div className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {formatCurrency(netAmount, currencySymbol)}
          </div>
          <div className="text-[0.6875rem] text-text-muted uppercase tracking-wider font-semibold mt-0.5">
            Net PnL ({currencySymbol} & %)
          </div>
        </div>

        <div className="text-[0.6875rem] text-text-muted font-mono">
          {stats?.totalTrades ?? 0} trades
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Net PnL Performance" size={size}>
      <div className="flex items-center justify-between flex-1 gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className={cn(
              "text-3xl font-bold tabular-nums tracking-tight",
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

        <div className="text-right shrink-0">
          <div className="text-xs text-text-muted">Total Net R</div>
          <div className={cn(
            "text-xl font-bold font-mono tabular-nums",
            (stats?.netR ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {(stats?.netR ?? 0) >= 0 ? '+' : ''}{(stats?.netR ?? 0).toFixed(1)}R
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

