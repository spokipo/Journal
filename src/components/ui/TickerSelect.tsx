import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  asset_class: 'forex' | 'crypto' | 'indices' | 'commodities';
  digits: number;
}

interface TickerSelectProps {
  value: string;
  onChange: (symbol: string, instrument?: Instrument) => void;
  error?: boolean;
  className?: string;
}

// §2 Tokens & §4 Pill/Badge: px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase
const CLASS_BADGES: Record<Instrument['asset_class'], { label: string; className: string }> = {
  forex: { label: 'FX', className: 'bg-blue-500/10 text-blue-500' },
  crypto: { label: 'CRYPTO', className: 'bg-amber-500/10 text-amber-500' },
  commodities: { label: 'COMMODITY', className: 'bg-emerald-500/10 text-emerald-500' },
  indices: { label: 'INDEX', className: 'bg-canvas text-text-muted border border-border-card' },
};

export function TickerSelect({ value, onChange, error, className }: TickerSelectProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadInstruments() {
      const { data } = await supabase
        .from('instruments')
        .select('id, symbol, name, asset_class, digits')
        .eq('is_active', true)
        .order('symbol', { ascending: true });
      if (data) setInstruments(data as Instrument[]);
    }
    loadInstruments();
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return instruments;
    return instruments.filter(
      (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [instruments, search]);

  const selected = instruments.find((i) => i.symbol === value);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger: L1 Element (rounded-[18px], min-h-11 on mobile, h-10 on desktop) */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full min-h-11 md:min-h-10 h-11 md:h-10 bg-card md:bg-canvas border rounded-[18px] px-3.5 flex items-center justify-between text-xs md:text-sm text-text-main transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-xs",
          error
            ? "border-rose-500 ring-1 ring-rose-500/20"
            : isOpen
              ? "border-blue-500"
              : "border-border-card hover:border-blue-500/50"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase font-mono shrink-0",
                  CLASS_BADGES[selected.asset_class]?.className
                )}
              >
                {CLASS_BADGES[selected.asset_class]?.label}
              </span>
              <span className="font-semibold font-mono tracking-tight text-text-main">
                {selected.symbol}
              </span>
            </>
          ) : (
            <span className="text-text-muted/60 text-xs md:text-sm">
              Select instrument...
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "text-text-muted shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-text-main"
          )}
        />
      </button>

      {/* Popover Panel: L2 Surface (rounded-[18px], z-30 dropdown scale) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border-card rounded-[18px] p-2 shadow-2xl z-30 flex flex-col max-h-64 overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="relative mb-2 shrink-0">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol..."
                className="w-full h-10 md:h-8 pl-8 pr-7 bg-canvas border border-border-card rounded-[14px] text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-canvas border border-border-card text-text-muted hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List: L0 items (rounded-[14px], touch target >= 44px on mobile) */}
            <div className="overflow-y-auto space-y-1 flex-1 pr-1 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="text-center py-4 text-xs text-text-muted">
                  No instruments found
                </div>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.symbol === value;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(item.symbol, item);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full min-h-11 md:min-h-9 px-3 py-2 rounded-[14px] flex items-center justify-between text-xs transition-colors cursor-pointer text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20",
                        isSelected
                          ? "bg-blue-500/10 text-blue-500 font-semibold"
                          : "text-text-main hover:bg-canvas active:scale-[0.99]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase font-mono shrink-0",
                            CLASS_BADGES[item.asset_class]?.className
                          )}
                        >
                          {CLASS_BADGES[item.asset_class]?.label}
                        </span>
                        <span className="font-semibold font-mono tracking-tight text-xs md:text-sm truncate">
                          {item.symbol}
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-blue-500 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}