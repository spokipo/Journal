import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Standard Switch component conforming to design.md §4:
 * Visual track: h-8 w-[3.25rem] rounded-full (32x52px)
 * On: bg-blue-500, Off: bg-canvas border border-border-card
 * Thumb: h-7 w-7 rounded-full bg-white, spring 450/35
 * Hit area: minimum 44x44px (min-h-11 min-w-11)
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
}: SwitchProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex items-center justify-center min-h-11 min-w-11 p-1 rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      {/* Visual Track */}
      <span
        className={cn(
          "h-8 w-[3.25rem] rounded-full p-0.5 transition-colors flex items-center shrink-0",
          checked
            ? "bg-blue-500 border border-blue-500"
            : "bg-canvas border border-border-card"
        )}
      >
        {/* Thumb */}
        <motion.span
          className="h-7 w-7 rounded-full bg-white shadow-sm block shrink-0"
          initial={false}
          animate={{
            x: checked ? 20 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 450,
            damping: 35,
          }}
        />
      </span>
    </button>
  );
}
