import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check } from 'lucide-react';
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
}

const CLASS_BADGES: Record<string, { label: string; color: string }> = {
  forex: { label: 'FX', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  crypto: { label: 'CRYPTO', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  indices: { label: 'INDEX', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  commodities: { label: 'COMMODITY', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

export function TickerSelect({ value, onChange, error }: TickerSelectProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return instruments;
    return instruments.filter(
      (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [instruments, search]);

  const selected = instruments.find((i) => i.symbol === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-11 bg-canvas border rounded-[18px] px-3.5 flex items-center justify-between text-sm text-text-main transition-all cursor-pointer",
          error 
            ? "border-rose-500" 
            : "border-border-card hover:border-blue-500/50 focus:border-blue-500"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono shrink-0",
                  CLASS_BADGES[selected.asset_class]?.color
                )}
              >
                {CLASS_BADGES[selected.asset_class]?.label}
              </span>
              <span className="font-semibold tracking-tight font-mono">{selected.symbol}</span>
              <span className="text-xs text-text-muted truncate hidden sm:inline">
                {selected.name}
              </span>
            </>
          ) : (
            <span className="text-text-muted/60 text-xs sm:text-sm">Select asset (EURUSD, XAUUSD)...</span>
          )}
        </div>
        <ChevronDown size={15} className="text-text-muted shrink-0 opacity-60" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border-card rounded-[20px] p-2 shadow-2xl z-50 flex flex-col max-h-64 overflow-hidden"
          >
            <div className="relative mb-2 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol (e.g. GBP, XAU, GER)..."
                className="w-full h-8 bg-canvas border border-border-card rounded-[12px] pl-8 pr-3 text-xs text-text-main outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-y-auto space-y-0.5 flex-1 pr-1 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="text-center py-4 text-xs text-text-muted">No instruments found</div>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.symbol === value;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onChange(item.symbol, item);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-2.5 py-2 rounded-[12px] flex items-center justify-between text-xs transition-colors cursor-pointer text-left",
                        isSelected
                          ? "bg-blue-500/10 text-blue-500 font-semibold"
                          : "text-text-main hover:bg-canvas"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold border font-mono shrink-0",
                            CLASS_BADGES[item.asset_class]?.color
                          )}
                        >
                          {CLASS_BADGES[item.asset_class]?.label}
                        </span>
                        <span className="font-semibold font-mono">{item.symbol}</span>
                        <span className="text-[11px] text-text-muted">{item.name}</span>
                      </div>
                      {isSelected && <Check size={14} className="text-blue-500" />}
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