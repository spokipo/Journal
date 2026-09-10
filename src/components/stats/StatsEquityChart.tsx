import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { EquityPoint } from '../../lib/statsEngine';

interface StatsEquityChartProps {
  equityCurve: EquityPoint[];
  initialBalance?: number;
  metricMode: 'dual' | 'r' | 'amount';
}

export function StatsEquityChart({
  equityCurve,
  initialBalance = 10000,
  metricMode,
}: StatsEquityChartProps) {
  const [chartUnit, setChartUnit] = useState<'r' | 'amount'>(() =>
    metricMode === 'amount' ? 'amount' : 'r'
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync unit with toolbar metricMode if user changes it
  React.useEffect(() => {
    if (metricMode === 'amount') setChartUnit('amount');
    else if (metricMode === 'r') setChartUnit('r');
  }, [metricMode]);

  // Transform data points
  const points = useMemo(() => {
    if (equityCurve.length === 0) return [];
    
    // Prepend origin point (0 R or initial balance)
    const firstDate = equityCurve[0].date;
    const origin: EquityPoint = {
      tradeId: 'origin',
      date: firstDate,
      symbol: 'Start',
      direction: 'LONG',
      outcome: 'BE',
      pnlR: 0,
      pnlAmount: 0,
      cumulativeR: 0,
      cumulativeAmount: 0,
      totalBalance: initialBalance,
      accountName: equityCurve[0].accountName,
    };

    return [origin, ...equityCurve];
  }, [equityCurve, initialBalance]);

  const isUsingR = chartUnit === 'r';

  // Compute SVG dimensions and paths
  const chartMetrics = useMemo(() => {
    if (points.length < 2) {
      return { pathD: '', areaD: '', yZero: 0, minVal: 0, maxVal: 0, yTicks: [] };
    }

    const values = points.map((p) => (isUsingR ? p.cumulativeR : p.cumulativeAmount));
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    // Give some breathing room
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    } else {
      const padding = (maxVal - minVal) * 0.12;
      minVal -= padding;
      maxVal += padding;
    }

    // Always include zero line in range for reference
    if (minVal > 0) minVal = 0;
    if (maxVal < 0) maxVal = 0;

    const width = 800;
    const height = 240;
    const paddingLeft = 10;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 20;

    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;

    const getY = (val: number) => {
      const normalized = (val - minVal) / (maxVal - minVal);
      return height - paddingBottom - normalized * innerHeight;
    };

    const getX = (idx: number) => {
      return paddingLeft + (idx / (points.length - 1)) * innerWidth;
    };

    const coords = points.map((p, idx) => ({
      x: getX(idx),
      y: getY(isUsingR ? p.cumulativeR : p.cumulativeAmount),
    }));

    // Construct line path
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    // Construct area path
    const yZero = getY(0);
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;

    // Horizontal gridline ticks
    const tickCount = 4;
    const yTicks: { val: number; y: number }[] = [];
    for (let i = 0; i <= tickCount; i++) {
      const val = minVal + (i / tickCount) * (maxVal - minVal);
      yTicks.push({ val, y: getY(val) });
    }

    return { pathD, areaD, yZero, minVal, maxVal, yTicks, coords, width, height };
  }, [points, isUsingR]);

  const lastPoint = points[points.length - 1];
  const finalValue = lastPoint ? (isUsingR ? lastPoint.cumulativeR : lastPoint.cumulativeAmount) : 0;
  const isNetProfit = finalValue >= 0;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length < 2) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, clientX / rect.width));
    const index = Math.round(relativeX * (points.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeHover = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="bg-card border border-border-card rounded-[26px] p-5 shadow-sm flex flex-col justify-between"
    >
      {/* Chart Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-main">Equity Curve</h3>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold font-mono uppercase",
                isNetProfit ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}
            >
              {isUsingR
                ? `${finalValue >= 0 ? '+' : ''}${finalValue.toFixed(2)} R`
                : `${finalValue >= 0 ? '+' : ''}$${finalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <p className="text-[0.6875rem] text-text-muted mt-0.5">
            Cumulative performance across {equityCurve.length} executed trades
          </p>
        </div>

        {/* Unit Selector (R vs Currency) */}
        <div className="flex items-center gap-1 bg-canvas border border-border-card rounded-[14px] p-0.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartUnit('r')}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-[10px] transition-colors cursor-pointer",
              chartUnit === 'r' ? "bg-card text-blue-500 shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            R-Multiple
          </button>
          <button
            type="button"
            onClick={() => setChartUnit('amount')}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-[10px] transition-colors cursor-pointer",
              chartUnit === 'amount' ? "bg-card text-blue-500 shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            Monetary ($)
          </button>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-[240px] select-none">
        {points.length < 2 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted text-xs">
            <span>Not enough trades to render equity curve</span>
          </div>
        ) : (
          <>
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Gradient Fill: 10% opacity as per §8 */}
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isNetProfit ? '#10b981' : '#f43f5e'}
                    stopOpacity="0.18"
                  />
                  <stop
                    offset="100%"
                    stopColor={isNetProfit ? '#10b981' : '#f43f5e'}
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines only (§8: no vertical lines, 40% opacity) */}
              {chartMetrics.yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1="0"
                    y1={tick.y}
                    x2={chartMetrics.width}
                    y2={tick.y}
                    stroke="currentColor"
                    className="text-border-card opacity-40"
                    strokeWidth="1"
                    strokeDasharray={tick.val === 0 ? 'none' : '4 4'}
                  />
                  <text
                    x="8"
                    y={tick.y - 4}
                    className="text-[0.6875rem] fill-text-muted font-mono"
                    textAnchor="start"
                  >
                    {isUsingR
                      ? `${tick.val.toFixed(1)}R`
                      : `$${Math.round(tick.val).toLocaleString()}`}
                  </text>
                </g>
              ))}

              {/* Gradient Area */}
              <path d={chartMetrics.areaD} fill="url(#equityGradient)" />

              {/* Equity Line: status palette only (§8) */}
              <path
                d={chartMetrics.pathD}
                fill="none"
                stroke={isNetProfit ? '#10b981' : '#f43f5e'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Hover Indicator Line & Dot */}
              {hoverIndex !== null && chartMetrics.coords && chartMetrics.coords[hoverIndex] && (
                <g>
                  <line
                    x1={chartMetrics.coords[hoverIndex].x}
                    y1={15}
                    x2={chartMetrics.coords[hoverIndex].x}
                    y2={chartMetrics.height - 20}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={chartMetrics.coords[hoverIndex].x}
                    cy={chartMetrics.coords[hoverIndex].y}
                    r="4.5"
                    className="fill-blue-500 stroke-card stroke-2"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip: L2 compact card conforming to §8 */}
            {activeHover && hoverIndex !== null && (
              <div
                className="absolute pointer-events-none z-30 transition-transform duration-75"
                style={{
                  left: `${(hoverIndex / (points.length - 1)) * 100}%`,
                  top: '10px',
                  transform: hoverIndex > points.length / 2 ? 'translateX(-105%)' : 'translateX(5%)',
                }}
              >
                <div className="bg-card/95 backdrop-blur-md border border-border-card rounded-[14px] p-2.5 shadow-xl text-xs space-y-1 min-w-[170px]">
                  <div className="flex items-center justify-between border-b border-border-card pb-1">
                    <span className="font-semibold text-text-main">
                      {activeHover.symbol === 'Start' ? 'Account Origin' : activeHover.symbol}
                    </span>
                    {activeHover.symbol !== 'Start' && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[0.625rem] font-bold font-mono",
                          activeHover.outcome === 'TP' ? 'bg-emerald-500/10 text-emerald-500' :
                          activeHover.outcome === 'SL' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                        )}
                      >
                        {activeHover.outcome}
                      </span>
                    )}
                  </div>

                  <div className="text-[0.6875rem] text-text-muted font-mono">
                    {new Date(activeHover.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>

                  {activeHover.symbol !== 'Start' && (
                    <div className="flex items-center justify-between text-[0.6875rem] font-mono">
                      <span className="text-text-muted">Trade PnL:</span>
                      <span
                        className={cn(
                          "font-bold",
                          activeHover.pnlR > 0 ? "text-emerald-500" : activeHover.pnlR < 0 ? "text-rose-500" : "text-text-muted"
                        )}
                      >
                        {activeHover.pnlR > 0 ? '+' : ''}{activeHover.pnlR}R ({activeHover.pnlAmount > 0 ? '+' : ''}${activeHover.pnlAmount.toFixed(2)})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[0.6875rem] font-mono pt-1 border-t border-border-card">
                    <span className="text-text-muted">Cumulative:</span>
                    <span className="font-bold text-text-main">
                      {isUsingR
                        ? `${activeHover.cumulativeR >= 0 ? '+' : ''}${activeHover.cumulativeR.toFixed(2)} R`
                        : `${activeHover.cumulativeAmount >= 0 ? '+' : ''}$${activeHover.cumulativeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  {!isUsingR && activeHover.totalBalance !== undefined && (
                    <div className="flex items-center justify-between text-[0.6875rem] font-mono">
                      <span className="text-text-muted">Balance:</span>
                      <span className="font-medium text-text-main">
                        ${activeHover.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Axis Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border-card text-[0.6875rem] text-text-muted font-mono">
        <span>{points.length > 0 ? new Date(points[0].date).toLocaleDateString() : ''}</span>
        <span className="text-center font-sans font-medium text-text-muted">
          {equityCurve.length} {equityCurve.length === 1 ? 'Trade' : 'Trades'}
        </span>
        <span>{points.length > 0 ? new Date(points[points.length - 1].date).toLocaleDateString() : ''}</span>
      </div>
    </div>
  );
}

