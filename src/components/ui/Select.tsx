import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  error?: boolean;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  icon: LeftIcon,
  size = 'md',
  error = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const sizeClasses = {
    sm: 'h-9 px-3 text-xs rounded-[14px]',
    md: 'h-11 px-4 text-sm rounded-[18px]',
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Кнопка-триггер */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-canvas border flex items-center justify-between text-text-main transition-all cursor-pointer select-none",
          sizeClasses[size],
          error
            ? "border-rose-500"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10"
            : "border-border-card hover:border-blue-500/50"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {LeftIcon && (
            <LeftIcon size={size === 'sm' ? 14 : 16} className="text-text-muted shrink-0" />
          )}
          {selectedOption?.icon && (
            <selectedOption.icon size={size === 'sm' ? 14 : 16} className="text-text-muted shrink-0" />
          )}
          <span className={cn("truncate text-left", !selectedOption && "text-text-muted/60")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={size === 'sm' ? 13 : 16}
          className={cn(
            "text-text-muted transition-transform duration-200 shrink-0 ml-2 opacity-60",
            isOpen && "rotate-180 text-blue-500 opacity-100"
          )}
        />
      </button>

      {/* Выпадающий список */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute left-0 right-0 top-full mt-1.5 bg-card border border-border-card rounded-[18px] p-1.5 shadow-xl z-50 max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-1",
              size === 'sm' && "min-w-[170px]"
            )}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-muted text-center">
                No options available
              </div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                const ItemIcon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-xs transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-blue-500/10 text-blue-500 font-semibold"
                        : "text-text-main hover:bg-canvas"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ItemIcon && <ItemIcon size={14} className="shrink-0 text-text-muted" />}
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-blue-500 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}