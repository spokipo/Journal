import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { SlidersHorizontal, Globe, X, RotateCcw } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

interface EconomicEventItem {
  id: string;
  currency: string;
  title: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  timestamp: number; // epoch ms
  forecast: string;
  previous: string;
}

const ALL_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'] as const;
const ALL_IMPACTS = ['HIGH', 'MED', 'LOW'] as const;

function generateWeeklyCalendar(): EconomicEventItem[] {
  const now = new Date();
  const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const dayMs = 86400000;
  const hourMs = 3600000;

  return [
    {
      id: 'ev_cpi',
      currency: 'USD',
      title: 'Core CPI (MoM & YoY)',
      impact: 'HIGH',
      timestamp: todayMorning + 13.5 * hourMs,
      forecast: '0.3%',
      previous: '0.3%',
    },
    {
      id: 'ev_claims',
      currency: 'USD',
      title: 'Initial Jobless Claims',
      impact: 'MED',
      timestamp: todayMorning + 13.5 * hourMs,
      forecast: '225K',
      previous: '228K',
    },
    {
      id: 'ev_ecb',
      currency: 'EUR',
      title: 'ECB Interest Rate Decision',
      impact: 'HIGH',
      timestamp: todayMorning + 14.25 * hourMs,
      forecast: '3.75%',
      previous: '4.00%',
    },
    {
      id: 'ev_fomc',
      currency: 'USD',
      title: 'FOMC Meeting Minutes',
      impact: 'HIGH',
      timestamp: todayMorning + 19 * hourMs,
      forecast: '—',
      previous: '—',
    },
    {
      id: 'ev_boj',
      currency: 'JPY',
      title: 'BoJ Policy Rate Decision',
      impact: 'HIGH',
      timestamp: todayMorning + 4 * hourMs,
      forecast: '0.25%',
      previous: '0.25%',
    },
    {
      id: 'ev_boe',
      currency: 'GBP',
      title: 'BoE Official Bank Rate',
      impact: 'HIGH',
      timestamp: todayMorning + dayMs + 12 * hourMs,
      forecast: '5.00%',
      previous: '5.00%',
    },
    {
      id: 'ev_nfp',
      currency: 'USD',
      title: 'Non-Farm Employment Change',
      impact: 'HIGH',
      timestamp: todayMorning + dayMs + 13.5 * hourMs,
      forecast: '165K',
      previous: '114K',
    },
    {
      id: 'ev_ur',
      currency: 'USD',
      title: 'Unemployment Rate',
      impact: 'HIGH',
      timestamp: todayMorning + dayMs + 13.5 * hourMs,
      forecast: '4.3%',
      previous: '4.3%',
    },
    {
      id: 'ev_cad_emp',
      currency: 'CAD',
      title: 'Employment Change',
      impact: 'HIGH',
      timestamp: todayMorning + dayMs + 13.5 * hourMs,
      forecast: '22.5K',
      previous: '-2.8K',
    },
    {
      id: 'ev_rba',
      currency: 'AUD',
      title: 'RBA Cash Rate Decision',
      impact: 'HIGH',
      timestamp: todayMorning + 2 * dayMs + 5.5 * hourMs,
      forecast: '4.35%',
      previous: '4.35%',
    },
    {
      id: 'ev_snb',
      currency: 'CHF',
      title: 'SNB Policy Rate Decision',
      impact: 'HIGH',
      timestamp: todayMorning + 2 * dayMs + 8.5 * hourMs,
      forecast: '1.25%',
      previous: '1.25%',
    },
  ].sort((a, b) => a.timestamp - b.timestamp);
}

export function EconomicNewsWidget({ size }: WidgetProps) {
  const [events] = useState<EconomicEventItem[]>(generateWeeklyCalendar);
  const [now, setNow] = useState<number>(Date.now());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  // Active filters
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([...ALL_CURRENCIES]);
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>(['HIGH', 'MED']);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedCurrs = localStorage.getItem('dashboard_news_currencies_v3');
      if (savedCurrs) {
        const parsed = JSON.parse(savedCurrs);
        if (Array.isArray(parsed) && parsed.length > 0) setSelectedCurrencies(parsed);
      }
      const savedImps = localStorage.getItem('dashboard_news_impacts_v3');
      if (savedImps) {
        const parsed = JSON.parse(savedImps);
        if (Array.isArray(parsed) && parsed.length > 0) setSelectedImpacts(parsed);
      }
    } catch (e) {}
  }, []);

  // Save filters
  const updateCurrencies = (newCurrs: string[]) => {
    setSelectedCurrencies(newCurrs);
    localStorage.setItem('dashboard_news_currencies_v3', JSON.stringify(newCurrs));
  };

  const updateImpacts = (newImps: string[]) => {
    setSelectedImpacts(newImps);
    localStorage.setItem('dashboard_news_impacts_v3', JSON.stringify(newImps));
  };

  // Live countdown update
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(ev.currency)) return false;
      if (selectedImpacts.length > 0 && !selectedImpacts.includes(ev.impact)) return false;
      return true;
    });
  }, [events, selectedCurrencies, selectedImpacts]);

  // Nearest future or recent event for small size
  const nextEvent = useMemo(() => {
    const upcoming = filteredEvents.filter(ev => ev.timestamp >= now - 1800000);
    return upcoming[0] || filteredEvents[0] || null;
  }, [filteredEvents, now]);

  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const isToday = date.toDateString() === new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tmrw' : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { localTime, dayLabel };
  };

  const getCountdownStr = (timestamp: number) => {
    const diffMs = timestamp - now;
    const diffM = Math.round(diffMs / 60000);
    if (diffM > 120) {
      const h = Math.floor(diffM / 60);
      const m = diffM % 60;
      return `in ${h}h ${m > 0 ? `${m}m` : ''}`;
    }
    if (diffM > 0) return `in ${diffM}m`;
    if (diffM >= -60) return `${Math.abs(diffM)}m ago`;
    return 'Released';
  };

  const getCurrencyStyle = (curr: string) => {
    switch (curr) {
      case 'USD': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25';
      case 'EUR': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
      case 'GBP': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25';
      case 'JPY': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25';
      case 'CAD': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25';
      case 'AUD': return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25';
      case 'CHF': return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25';
      default: return 'bg-canvas text-text-main border border-border-card';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25';
      case 'MED': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25';
      default: return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25';
    }
  };

  // Position popover
  useEffect(() => {
    if (!isFilterOpen || !triggerRef.current) return;
    const updateCoords = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 280 && rect.top > 280;

      let left = rect.right - popoverWidth;
      if (left < 12) left = 12;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }

      if (openUpwards) {
        setCoords({ bottom: window.innerHeight - rect.top + 6, left, width: popoverWidth });
      } else {
        setCoords({ top: rect.bottom + 6, left, width: popoverWidth });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [isFilterOpen]);

  const toggleCurrency = (c: string) => {
    if (selectedCurrencies.includes(c)) {
      if (selectedCurrencies.length > 1) updateCurrencies(selectedCurrencies.filter(item => item !== c));
    } else {
      updateCurrencies([...selectedCurrencies, c]);
    }
  };

  const toggleImpact = (imp: string) => {
    if (selectedImpacts.includes(imp)) {
      if (selectedImpacts.length > 1) updateImpacts(selectedImpacts.filter(item => item !== imp));
    } else {
      updateImpacts([...selectedImpacts, imp]);
    }
  };

  const filterTriggerButton = (
    <button
      ref={triggerRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsFilterOpen(prev => !prev);
      }}
      title="Filter economic events"
      className={cn(
        "w-8 h-8 rounded-full bg-canvas border border-border-card flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0",
        isFilterOpen ? "border-blue-500 text-blue-500" : "text-text-muted hover:text-text-main hover:bg-card"
      )}
    >
      <SlidersHorizontal size={14} />
    </button>
  );

  return (
    <div className="w-full h-full relative select-none">
      {size === 'small' ? (
        <WidgetCard size={size} className="justify-between text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
              <Globe size={14} className="text-rose-500 shrink-0" />
              <span>Economic News</span>
            </div>
            {filterTriggerButton}
          </div>

          {!nextEvent ? (
            <div className="my-auto text-center">
              <div className="text-sm font-semibold text-text-main">No Events</div>
              <div className="text-xs text-text-muted mt-0.5">Check currency filters</div>
            </div>
          ) : (
            <>
              <div className="my-auto">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("px-1.5 py-0.5 rounded-[8px] text-[0.6875rem] font-mono font-bold", getCurrencyStyle(nextEvent.currency))}>
                    {nextEvent.currency}
                  </span>
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase", getImpactBadge(nextEvent.impact))}>
                    {nextEvent.impact}
                  </span>
                </div>
                <div className="text-sm font-bold text-text-main truncate tracking-tight">
                  {nextEvent.title}
                </div>
              </div>

              <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono pt-1 border-t border-border-card/40">
                <span>{formatEventTime(nextEvent.timestamp).dayLabel} {formatEventTime(nextEvent.timestamp).localTime}</span>
                <span className={cn(
                  "font-bold",
                  nextEvent.timestamp - now > 0 && nextEvent.timestamp - now <= 1800000 ? "text-rose-500 animate-pulse" : "text-text-main"
                )}>
                  {getCountdownStr(nextEvent.timestamp)}
                </span>
              </div>
            </>
          )}
        </WidgetCard>
      ) : size === 'medium' ? (
        <WidgetCard 
          title="Economic Calendar" 
          size={size}
          action={filterTriggerButton}
        >
          {filteredEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Globe size={20} className="text-rose-500/40 mb-1" />
              <div className="text-sm font-semibold text-text-main">No events found</div>
              <div className="text-xs text-text-muted mt-0.5">Adjust currency or impact filters</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1 justify-between overflow-hidden">
              {filteredEvents.slice(0, 2).map(ev => {
                const { localTime, dayLabel } = formatEventTime(ev.timestamp);
                const countdown = getCountdownStr(ev.timestamp);
                const isImminent = ev.timestamp - now > 0 && ev.timestamp - now <= 1800000;

                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between px-3 py-2 rounded-[14px] bg-canvas border border-border-card hover:border-blue-500/30 transition-colors gap-2 min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn("px-1.5 py-0.5 rounded-[8px] text-[0.6875rem] font-mono font-bold shrink-0", getCurrencyStyle(ev.currency))}>
                        {ev.currency}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-text-main truncate">
                          {ev.title}
                        </div>
                        <div className="text-[0.6875rem] text-text-muted font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{dayLabel} {localTime}</span>
                          <span>•</span>
                          <span className={cn("font-bold uppercase", ev.impact === 'HIGH' ? 'text-rose-500' : 'text-amber-500')}>
                            {ev.impact}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={cn("text-xs font-mono font-bold", isImminent ? "text-rose-500 animate-pulse" : "text-text-main")}>
                        {countdown}
                      </div>
                      <div className="text-[0.6875rem] text-text-muted font-mono">
                        {ev.forecast !== '—' ? `Fc: ${ev.forecast}` : 'High Volatility'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      ) : (
        <WidgetCard 
          title="Economic Calendar" 
          size={size}
          action={filterTriggerButton}
        >
          {filteredEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Globe size={24} className="text-rose-500/40 mb-2" />
              <div className="text-base font-semibold text-text-main">No events found</div>
              <div className="text-xs text-text-muted mt-1">Adjust currency or impact filters</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[340px] pr-1">
              {filteredEvents.slice(0, 8).map(ev => {
                const { localTime, dayLabel } = formatEventTime(ev.timestamp);
                const countdown = getCountdownStr(ev.timestamp);
                const isImminent = ev.timestamp - now > 0 && ev.timestamp - now <= 1800000;

                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2.5 rounded-[14px] bg-canvas border border-border-card hover:border-blue-500/30 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn("px-2 py-0.5 rounded-[8px] text-xs font-mono font-bold shrink-0", getCurrencyStyle(ev.currency))}>
                        {ev.currency}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-main truncate">
                          {ev.title}
                        </div>
                        <div className="text-[0.6875rem] text-text-muted font-mono flex items-center gap-2 mt-0.5">
                          <span>{dayLabel} {localTime}</span>
                          <span>•</span>
                          <span className={cn("font-bold uppercase", ev.impact === 'HIGH' ? 'text-rose-500' : 'text-amber-500')}>
                            {ev.impact} Impact
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={cn("text-xs font-mono font-bold", isImminent ? "text-rose-500 animate-pulse" : "text-text-main")}>
                        {countdown}
                      </div>
                      <div className="text-[0.6875rem] text-text-muted font-mono mt-0.5">
                        Fc: {ev.forecast} / Pr: {ev.previous}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      )}

      {/* ANCHORED CONTEXT MENU / POPOVER FOR FILTERS PER DESIGN.MD §3 A & §5 */}
      {isFilterOpen && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setIsFilterOpen(false);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsFilterOpen(false);
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="fixed z-50 bg-card border border-border-card rounded-[18px] p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-border-card/40">
              <span className="text-xs font-semibold text-text-main">Calendar Filters</span>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="w-6 h-6 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted hover:text-text-main"
              >
                <X size={12} />
              </button>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-[0.6875rem] text-text-muted uppercase font-semibold tracking-wider mb-1.5">
                <span>Currencies</span>
                <button
                  type="button"
                  onClick={() => updateCurrencies([...ALL_CURRENCIES])}
                  className="text-blue-500 hover:underline text-[0.6875rem] normal-case"
                >
                  All
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_CURRENCIES.map(curr => {
                  const isSelected = selectedCurrencies.includes(curr);
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => toggleCurrency(curr)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer",
                        isSelected
                          ? "bg-blue-500 text-white shadow-2xs"
                          : "bg-canvas border border-border-card text-text-muted hover:text-text-main"
                      )}
                    >
                      {curr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[0.6875rem] text-text-muted uppercase font-semibold tracking-wider mb-1.5">
                Impact Level
              </div>
              <div className="flex gap-1.5">
                {ALL_IMPACTS.map(imp => {
                  const isSelected = selectedImpacts.includes(imp);
                  return (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => toggleImpact(imp)}
                      className={cn(
                        "flex-1 py-1 rounded-full text-xs font-bold transition-all cursor-pointer text-center",
                        isSelected
                          ? "bg-blue-500 text-white shadow-2xs"
                          : "bg-canvas border border-border-card text-text-muted hover:text-text-main"
                      )}
                    >
                      {imp}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}
