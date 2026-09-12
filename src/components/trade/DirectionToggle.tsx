import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DirectionToggleProps {
  value: string;
  onChange: (val: string) => void;
  namespace: string;
  variant?: 'trade' | 'idea';
  disabled?: boolean;
}

export function DirectionToggle({
  value,
  onChange,
  namespace,
  variant = 'trade',
  disabled = false,
}: DirectionToggleProps) {
  const isUpper = value === 'LONG' || value === 'SHORT';
  const isLong = value.toUpperCase() === 'LONG';
  const isShort = value.toUpperCase() === 'SHORT';

  const longValue = isUpper ? 'LONG' : 'long';
  const shortValue = isUpper ? 'SHORT' : 'short';

  const longLabel = variant === 'idea' ? 'Long Bias' : 'Long / Buy';
  const shortLabel = variant === 'idea' ? 'Short Bias' : 'Short / Sell';

  return (
    <div className="relative grid grid-cols-2 gap-1 p-1 bg-card md:bg-canvas border border-border-card rounded-full min-h-11 md:h-10 items-stretch">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(longValue)}
        className={cn(
          "relative h-full rounded-full flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 cursor-pointer select-none disabled:opacity-50",
          isLong
            ? "bg-emerald-500 text-white shadow-xs"
            : "text-text-muted hover:text-text-main"
        )}
      >
        <TrendingUp size={14} />
        <span>{longLabel}</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(shortValue)}
        className={cn(
          "relative h-full rounded-full flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 cursor-pointer select-none disabled:opacity-50",
          isShort
            ? "bg-rose-500 text-white shadow-xs"
            : "text-text-muted hover:text-text-main"
        )}
      >
        <TrendingDown size={14} />
        <span>{shortLabel}</span>
      </button>
    </div>
  );
}
