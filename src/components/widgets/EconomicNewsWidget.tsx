import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { SlidersHorizontal, Globe, X, RotateCcw, Loader2 } from 'lucide-react';
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

export function EconomicNewsWidget({ size }: WidgetProps) {
  const [events, setEvents] = useState<EconomicEventItem[]>(() => {
    try {
      const cached = localStorage.getItem('dashboard_live_news_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => events.length === 0);
  const [now, setNow] = useState<number>(Date.now());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  // Active filters
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([...ALL_CURRENCIES]);
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>(['HIGH', 'MED']);

  // Live weekly calendar loader
  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/calendar');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted && Array.isArray(data?.events)) {
          setEvents(data.events);
          try {
            localStorage.setItem('dashboard_live_news_v1', JSON.stringify(data.events));
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to load real economic calendar:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 10 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

function ImpactDot({ impact, isImminent, className }: { impact: 'HIGH' | 'MED' | 'LOW'; isImminent?: boolean; className?: string }) {
  const dotColor = impact === 'HIGH' 
    ? 'bg-rose-500' 
    : impact === 'MED' 
    ? 'bg-amber-500' 
    : 'bg-blue-400';

  return (
    <span className={cn("relative flex items-center justify-center shrink-0", className)}>
      {isImminent && impact === 'HIGH' && (
        <span className="absolute w-2.5 h-2.5 rounded-full bg-rose-500/40 animate-ping" />
      )}
      <span 
        className={cn("w-2 h-2 rounded-full", dotColor)} 
        title={`${impact === 'HIGH' ? 'High' : impact === 'MED' ? 'Medium' : 'Low'} Impact`}
      />
    </span>
  );
}

  // Strictly today's events for all widget sizes
  const filteredTodayEvents = useMemo(() => {
    const todayDate = new Date(now);
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth();
    const todayDay = todayDate.getDate();

    return events.filter(ev => {
      const evDate = new Date(ev.timestamp);
      const isToday = 
        evDate.getFullYear() === todayYear &&
        evDate.getMonth() === todayMonth &&
        evDate.getDate() === todayDay;
      if (!isToday) return false;

      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(ev.currency)) return false;
      if (selectedImpacts.length > 0 && !selectedImpacts.includes(ev.impact)) return false;
      return true;
    });
  }, [events, now, selectedCurrencies, selectedImpacts]);

  // Small size: Nearest event today
  const nearestEvent = useMemo(() => {
    if (filteredTodayEvents.length === 0) return null;
    const upcoming = filteredTodayEvents.filter(ev => ev.timestamp >= now - 15 * 60 * 1000);
    return upcoming[0] || filteredTodayEvents[filteredTodayEvents.length - 1];
  }, [filteredTodayEvents, now]);

  // Medium size: Nearest 2 events today
  const mediumEvents = useMemo(() => {
    if (filteredTodayEvents.length === 0) return [];
    const upcoming = filteredTodayEvents.filter(ev => ev.timestamp >= now - 15 * 60 * 1000);
    if (upcoming.length >= 2) return upcoming.slice(0, 2);
    if (upcoming.length === 1) {
      const passed = filteredTodayEvents.filter(ev => ev.timestamp < now - 15 * 60 * 1000);
      return [...passed.slice(-1), ...upcoming];
    }
    return filteredTodayEvents.slice(-2);
  }, [filteredTodayEvents, now]);

  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return { localTime };
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
    return 'Passed';
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
            <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
              <Globe size={14} className="text-rose-500 shrink-0" />
              <span>Today's News</span>
            </div>
            {filterTriggerButton}
          </div>

          {isLoading && events.length === 0 ? (
            <div className="my-auto text-center flex flex-col items-center justify-center">
              <Loader2 size={16} className="animate-spin text-blue-500 mb-1" />
              <div className="text-xs text-text-muted">Loading calendar...</div>
            </div>
          ) : !nearestEvent ? (
            <div className="my-auto text-center">
              <div className="text-sm font-semibold text-text-main">No Events Today</div>
              <div className="text-xs text-text-muted mt-0.5">No releases scheduled for today</div>
            </div>
          ) : (
            <>
              <div className="my-auto">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("px-1.5 py-0.5 rounded-[8px] text-[0.6875rem] font-mono font-bold", getCurrencyStyle(nearestEvent.currency))}>
                    {nearestEvent.currency}
                  </span>
                  <ImpactDot 
                    impact={nearestEvent.impact} 
                    isImminent={nearestEvent.timestamp - now > 0 && nearestEvent.timestamp - now <= 1800000} 
                  />
                </div>
                <div className="text-sm font-bold text-text-main truncate tracking-tight">
                  {nearestEvent.title}
                </div>
              </div>

              <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono pt-1 border-t border-border-card/40">
                <span>{formatEventTime(nearestEvent.timestamp).localTime}</span>
                <span className={cn(
                  "font-bold",
                  nearestEvent.timestamp - now > 0 && nearestEvent.timestamp - now <= 1800000 ? "text-rose-500 animate-pulse" : "text-text-main"
                )}>
                  {getCountdownStr(nearestEvent.timestamp)}
                </span>
              </div>
            </>
          )}
        </WidgetCard>
      ) : size === 'medium' ? (
        <WidgetCard 
          title="Today's News" 
          size={size}
          action={filterTriggerButton}
        >
          {isLoading && events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Loader2 size={20} className="animate-spin text-blue-500 mb-2" />
              <div className="text-xs text-text-muted">Loading calendar...</div>
            </div>
          ) : mediumEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Globe size={20} className="text-rose-500/40 mb-1" />
              <div className="text-sm font-semibold text-text-main">No Events Today</div>
              <div className="text-xs text-text-muted mt-0.5">No releases scheduled for today</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1 justify-between overflow-hidden">
              {mediumEvents.map(ev => {
                const { localTime } = formatEventTime(ev.timestamp);
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
                      <ImpactDot impact={ev.impact} isImminent={isImminent} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-text-main truncate">
                          {ev.title}
                        </div>
                        <div className="text-[0.6875rem] text-text-muted font-mono flex items-center gap-2 mt-0.5">
                          <span>{localTime}</span>
                          {ev.forecast !== '—' && (
                            <>
                              <span>•</span>
                              <span>Fc: {ev.forecast}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={cn("text-xs font-mono font-bold", isImminent ? "text-rose-500 animate-pulse" : "text-text-main")}>
                        {countdown}
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
          title="Today's News" 
          size={size}
          action={filterTriggerButton}
        >
          {isLoading && events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Loader2 size={24} className="animate-spin text-blue-500 mb-2" />
              <div className="text-xs text-text-muted">Loading calendar releases...</div>
            </div>
          ) : filteredTodayEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Globe size={24} className="text-rose-500/40 mb-1" />
              <div className="text-sm font-semibold text-text-main">No Events Match Filters</div>
              <div className="text-xs text-text-muted mt-0.5">Try selecting more currencies or lower impact</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[340px] pr-1">
              {filteredTodayEvents.map(ev => {
                const { localTime } = formatEventTime(ev.timestamp);
                const countdown = getCountdownStr(ev.timestamp);
                const isImminent = ev.timestamp - now > 0 && ev.timestamp - now <= 1800000;

                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2.5 rounded-[14px] bg-canvas border border-border-card hover:border-blue-500/30 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn("px-2 py-0.5 rounded-[8px] text-xs font-mono font-bold shrink-0", getCurrencyStyle(ev.currency))}>
                        {ev.currency}
                      </span>
                      <ImpactDot impact={ev.impact} isImminent={isImminent} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-text-main truncate">
                          {ev.title}
                        </div>
                        <div className="text-[0.6875rem] text-text-muted font-mono flex items-center gap-2 mt-0.5">
                          <span>{localTime}</span>
                          {ev.forecast !== '—' && <span>• Fc: {ev.forecast}</span>}
                          {ev.previous !== '—' && <span>• Pr: {ev.previous}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={cn("text-xs font-mono font-bold", isImminent ? "text-rose-500 animate-pulse" : "text-text-main")}>
                        {countdown}
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
                  className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 text-[0.6875rem] font-medium transition-colors cursor-pointer"
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
                          ? "bg-blue-500 border border-blue-500 text-white shadow-2xs"
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
              <div className="flex gap-2">
                {ALL_IMPACTS.map(imp => {
                  const isSelected = selectedImpacts.includes(imp);
                  return (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => toggleImpact(imp)}
                      className={cn(
                        "flex-1 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                        isSelected
                          ? "bg-blue-500 border border-blue-500 text-white shadow-2xs"
                          : "bg-canvas border border-border-card text-text-muted hover:text-text-main"
                      )}
                    >
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isSelected 
                          ? "bg-white" 
                          : imp === 'HIGH' ? "bg-rose-500" : imp === 'MED' ? "bg-amber-500" : "bg-blue-400"
                      )} />
                      <span>{imp === 'HIGH' ? 'High' : imp === 'MED' ? 'Med' : 'Low'}</span>
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
