import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Check, 
  type LucideIcon 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value?: string;
  id?: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  children?: SelectOption[];
}

export const getOptionValue = (opt: SelectOption): string => opt.value ?? opt.id ?? '';

interface SelectProps {
  value?: string | string[];
  onChange: (value: any) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  size?: 'sm' | 'md';
  error?: boolean;
  className?: string;
  multiple?: boolean;
  align?: 'left' | 'right';
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
  multiple = false,
  align = 'left',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    cat_outcome: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const findOptionByValue = (opts: SelectOption[], val: string): SelectOption | undefined => {
    for (const opt of opts) {
      if (getOptionValue(opt) === val) return opt;
      if (opt.children) {
        const found = findOptionByValue(opt.children, val);
        if (found) return found;
      }
    }
    return undefined;
  };

  const toggleCategory = (catValue: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catValue]: !prev[catValue],
    }));
  };

  const handleSelect = (option: SelectOption) => {
    const val = getOptionValue(option);
    if (multiple) {
      const isAlreadySelected = selectedValues.includes(val);
      const nextValues = isAlreadySelected
        ? selectedValues.filter((v) => v !== val)
        : [...selectedValues, val];
      onChange(nextValues);
    } else {
      onChange(val);
      setIsOpen(false);
    }
  };

  const getTriggerText = () => {
    if (multiple) return placeholder;
    if (selectedValues.length > 0) {
      const found = findOptionByValue(options, selectedValues[0]);
      if (found) return found.label;
    }
    return placeholder;
  };

  const hasSelection = selectedValues.length > 0;

  const sizeClasses = {
    sm: "h-9 px-3 rounded-[18px] text-xs",
    md: "h-11 md:h-10 px-3.5 rounded-[18px] text-xs md:text-sm",
  };

  return (
    <div className={cn("relative select-none", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 bg-card border transition-all cursor-pointer select-none text-left",
          sizeClasses[size],
          error
            ? "border-rose-500 focus:border-rose-500"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10"
            : "border-border-card hover:border-blue-500/40",
          !hasSelection && "text-text-muted"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {LeftIcon && (
            <LeftIcon 
              size={size === 'sm' ? 14 : 16} 
              className={cn("shrink-0", hasSelection ? "text-blue-500" : "text-text-muted")} 
            />
          )}
          <span className={cn("truncate font-medium", hasSelection ? "text-text-main" : "text-text-muted/60")}>
            {getTriggerText()}
          </span>
        </div>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={cn(
            "text-text-muted shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-blue-500"
          )}
        />
      </button>

      {/* Popover Menu (Anchored, L2 Surface) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-full mt-1.5 w-full min-w-[200px] md:min-w-[220px] bg-card border border-border-card z-50 shadow-2xl rounded-[18px] p-1.5 max-h-64 overflow-y-auto flex flex-col custom-scrollbar",
              align === 'right' ? "right-0 left-auto" : "left-0"
            )}
          >
            {options.length === 0 ? (
              <div className="py-3 text-center text-xs text-text-muted">
                No options available
              </div>
            ) : (
              options.map((option, idx) => {
                const hasChildren = Boolean(option.children && option.children.length > 0);
                const optVal = getOptionValue(option);
                const itemKey = optVal ? `opt-${optVal}` : `opt-idx-${idx}`;

                // Обычный плоский пункт
                if (!hasChildren) {
                  const isSelected = selectedValues.includes(optVal);
                  const ItemIcon = option.icon;

                  return (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "w-full h-11 md:h-9 px-2.5 rounded-[14px] flex items-center justify-between text-xs transition-colors cursor-pointer text-left select-none",
                        isSelected
                          ? "bg-blue-500/10 text-blue-500 font-medium"
                          : "text-text-main hover:bg-canvas font-normal"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        {ItemIcon && (
                          <ItemIcon
                            size={14}
                            className={cn("shrink-0", isSelected ? "text-blue-500" : "text-text-muted")}
                          />
                        )}
                        <span className="truncate">{option.label}</span>
                      </div>
                      {isSelected && <Check size={14} className="text-blue-500 shrink-0" />}
                    </button>
                  );
                }

                // Группа с подпунктами
                const isExpanded = Boolean(expandedCategories[optVal]);
                const selectedChildrenCount = option.children!.filter((c) =>
                  selectedValues.includes(getOptionValue(c))
                ).length;

                return (
                  <div key={itemKey} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => toggleCategory(optVal)}
                      className="w-full h-11 md:h-8 px-2 rounded-[14px] flex items-center justify-between text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas/60 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={12}
                          className={cn(
                            "transition-transform duration-150",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <span className="uppercase tracking-wider text-[0.6875rem]">
                          {option.label}
                        </span>
                      </div>

                      {selectedChildrenCount > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-blue-500/15 text-blue-500 text-[0.6875rem] font-mono font-bold flex items-center justify-center">
                          {selectedChildrenCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden pl-5 space-y-0.5"
                        >
                          {option.children!.map((child, childIdx) => {
                            const childVal = getOptionValue(child);
                            const childKey = childVal ? `child-${childVal}` : `child-${itemKey}-${childIdx}`;
                            const isChildSelected = selectedValues.includes(childVal);
                            return (
                              <button
                                key={childKey}
                                type="button"
                                onClick={() => handleSelect(child)}
                                className={cn(
                                  "w-full h-11 md:h-8 px-2 rounded-[14px] flex items-center justify-between text-xs transition-colors cursor-pointer text-left select-none",
                                  isChildSelected
                                    ? "bg-blue-500/10 text-blue-500 font-medium"
                                    : "text-text-main hover:bg-canvas font-normal"
                                )}
                              >
                                <span className="truncate pr-2">{child.label}</span>
                                {isChildSelected && (
                                  <Check size={14} className="text-blue-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}