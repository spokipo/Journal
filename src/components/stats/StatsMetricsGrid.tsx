import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Scale, 
  Activity, 
  Award,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StatsSummary } from '../../lib/statsEngine';

interface StatsMetricsGridProps {
  stats: StatsSummary;
  metricMode: 'dual' | 'r' | 'amount';
  currency?: string;
}

export function StatsMetricsGrid({
  stats,
  metricMode,
  currency = 'USD',
}: StatsMetricsGridProps) {
  const isPositiveR = stats.netR > 0;
  const isNegativeR = stats.netR < 0;
  const isPositiveAmt = (stats.netAmount ?? 0) > 0;
  const isNegativeAmt = (stats.netAmount ?? 0) < 0;

  const formatR = (r: number) => {
    const sign = r > 0 ? '+' : '';
    return `${sign}${r.toFixed(2)} R`;
  };

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) {
      return '—';
    }
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}$${abs}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Net PnL (R & Monetary) */}
      <div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-text-muted mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Net Result</span>
          <div
            className={cn(
              "w-8 h-8 rounded-[12px] flex items-center justify-center",
              isPositiveR ? "bg-emerald-500/10 text-emerald-500" :
              isNegativeR ? "bg-rose-500/10 text-rose-500" : "bg-canvas text-text-muted"
            )}
          >
            {isPositiveR ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
        </div>

        <div>
          {/* Main Figure */}
          {metricMode === 'r' ? (
            <div
              className={cn(
                "text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight",
                isPositiveR ? "text-emerald-500" : isNegativeR ? "text-rose-500" : "text-text-main"
              )}
            >
              {formatR(stats.netR)}
            </div>
          ) : metricMode === 'amount' ? (
            <div
              className={cn(
                "text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight",
                isPositiveAmt ? "text-emerald-500" : isNegativeAmt ? "text-rose-500" : "text-text-main"
              )}
            >
              {formatMoney(stats.netAmount)}
            </div>
          ) : (
            <div>
              <div
                className={cn(
                  "text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight",
                  isPositiveR ? "text-emerald-500" : isNegativeR ? "text-rose-500" : "text-text-main"
                )}
              >
                {formatR(stats.netR)}
              </div>
              <div
                className={cn(
                  "text-xs font-mono tabular-nums font-semibold mt-0.5",
                  isPositiveAmt ? "text-emerald-500/80" : isNegativeAmt ? "text-rose-500/80" : "text-text-muted"
                )}
              >
                {formatMoney(stats.netAmount)}
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-border-card text-[0.6875rem] text-text-muted flex items-center justify-between font-mono">
          <span>Gross Win: {metricMode === 'amount' ? formatMoney(stats.grossWinAmount) : `+${stats.grossWinR.toFixed(1)}R`}</span>
          <span>Gross Loss: {metricMode === 'amount' ? formatMoney(stats.grossLossAmount !== null && stats.grossLossAmount !== undefined ? -stats.grossLossAmount : null) : `-${stats.grossLossR.toFixed(1)}R`}</span>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-text-muted mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Win Rate</span>
          <div className="w-8 h-8 rounded-[12px] bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Target size={16} />
          </div>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-text-main tracking-tight">
            {stats.winRate}%
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono mt-1 flex items-center gap-1.5">
            <span className="text-emerald-500 font-semibold">{stats.winCount}W</span>
            <span>•</span>
            <span className="text-rose-500 font-semibold">{stats.lossCount}L</span>
            {stats.beCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-500 font-semibold">{stats.beCount}BE</span>
              </>
            )}
            <span>({stats.totalTrades} trades)</span>
          </div>
        </div>

        {/* Win/Loss Multi-segment Bar */}
        <div className="w-full bg-canvas rounded-full h-1.5 mt-3 overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all"
            style={{ width: `${stats.winRate}%` }}
          />
          <div
            className="bg-amber-500 h-full transition-all"
            style={{ width: `${stats.beRate}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all"
            style={{ width: `${stats.lossRate}%` }}
          />
        </div>
      </div>

      {/* 3. Profit Factor */}
      <div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-text-muted mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Profit Factor</span>
          <div className="w-8 h-8 rounded-[12px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Scale size={16} />
          </div>
        </div>

        <div>
          <div
            className={cn(
              "text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight",
              stats.profitFactorR >= 1.5 ? "text-emerald-500" :
              stats.profitFactorR >= 1.0 ? "text-blue-500" : "text-rose-500"
            )}
          >
            {stats.profitFactorR === 0 && stats.totalTrades === 0 ? '—' : stats.profitFactorR.toFixed(2)}
          </div>
          <div className="text-[0.6875rem] text-text-muted mt-1">
            {stats.profitFactorR >= 2.0 ? 'Exceptional edge' :
             stats.profitFactorR >= 1.5 ? 'Strong edge' :
             stats.profitFactorR >= 1.0 ? 'Positive edge' : 'Negative edge'}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-border-card text-[0.6875rem] text-text-muted flex items-center justify-between font-mono">
          <span>Wins: {formatMoney(stats.grossWinAmount)}</span>
          <span>Losses: {formatMoney(stats.grossLossAmount !== null && stats.grossLossAmount !== undefined ? -stats.grossLossAmount : null)}</span>
        </div>
      </div>

      {/* 4. Expectancy */}
      <div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-text-muted mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Expectancy</span>
          <div className="w-8 h-8 rounded-[12px] bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Activity size={16} />
          </div>
        </div>

        <div>
          <div
            className={cn(
              "text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight",
              stats.expectancyR > 0 ? "text-emerald-500" :
              stats.expectancyR < 0 ? "text-rose-500" : "text-text-main"
            )}
          >
            {stats.expectancyR > 0 ? `+${stats.expectancyR.toFixed(2)}R` : `${stats.expectancyR.toFixed(2)}R`}
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono mt-1">
            {formatMoney(stats.expectancyAmount)} / trade
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-border-card text-[0.6875rem] text-text-muted flex items-center justify-between">
          <span>Expected return</span>
          <span className="font-mono text-text-main">per execution</span>
        </div>
      </div>

      {/* 5. Avg Win / Avg Loss */}
      <div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-text-muted mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Avg Win / Loss</span>
          <div className="w-8 h-8 rounded-[12px] bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
            <Award size={16} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-emerald-500 font-bold font-mono text-lg sm:text-xl tabular-nums">
              +{stats.avgWinR.toFixed(2)}R
            </span>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-rose-500 font-bold font-mono text-lg sm:text-xl tabular-nums">
              -{stats.avgLossR.toFixed(2)}R
            </span>
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono mt-1">
            W/L Ratio: <span className="font-semibold text-text-main">{stats.winLossRatioR.toFixed(2)}</span>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-border-card text-[0.6875rem] text-text-muted flex items-center justify-between font-mono">
          <span className="text-emerald-500/80">Avg: {formatMoney(stats.avgWinAmount)}</span>
          <span className="text-rose-500/80">Avg: {formatMoney(stats.avgLossAmount !== null && stats.avgLossAmount !== undefined ? -stats.avgLossAmount : null)}</span>
        </div>
      </div>

      {/* 6. Max Drawdown */}
      <div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-text-muted mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Max Drawdown</span>
          <div className="w-8 h-8 rounded-[12px] bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <ShieldAlert size={16} />
          </div>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-rose-500 tracking-tight">
            -{stats.maxDrawdownR.toFixed(2)}R
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono mt-1">
            {stats.maxDrawdownAmount !== null && stats.maxDrawdownAmount !== undefined
              ? `-${formatMoney(stats.maxDrawdownAmount)} (${(stats.maxDrawdownPercent ?? 0).toFixed(1)}%)`
              : '—'}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-border-card text-[0.6875rem] text-text-muted flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-500 font-mono">
            <Flame size={12} /> {stats.maxConsecutiveWins}W streak
          </span>
          <span className="text-rose-500 font-mono">
            {stats.maxConsecutiveLosses}L streak
          </span>
        </div>
      </div>
    </div>
  );
}

