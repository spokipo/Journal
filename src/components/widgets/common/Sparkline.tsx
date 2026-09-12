import React from 'react';
import { cn } from '../../../lib/utils';

export function Sparkline({ 
  points, 
  isPositive, 
  height = 40, 
  width = 120, 
  fill = false 
}: { 
  points: number[]; 
  isPositive: boolean; 
  height?: number; 
  width?: number; 
  fill?: boolean;
}) {
  const safePoints = points && points.length >= 2 
    ? points 
    : [100, 101, 102, 101, 103, 105, 104, 106];
  
  const min = Math.min(...safePoints);
  const max = Math.max(...safePoints);
  const range = max - min || 1;
  const padding = 4;
  const usableH = height - padding * 2;
  const usableW = width - padding * 2;

  const coords = safePoints.map((p, i) => {
    const x = padding + (i / (safePoints.length - 1)) * usableW;
    const y = height - padding - ((p - min) / range) * usableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `${pathD} L ${(width - padding).toFixed(1)},${height} L ${padding},${height} Z`;

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className={cn("w-full h-full overflow-visible", isPositive ? "text-emerald-500" : "text-rose-500")} 
      preserveAspectRatio="none"
    >
      {fill && <path d={areaD} fill="currentColor" fillOpacity="0.12" />}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

