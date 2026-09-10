import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { 
  SlidersHorizontal, 
  RotateCcw, 
  Globe, 
  ChevronDown, 
  Check 
} from 'lucide-react';
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

// Generate realistic rolling calendar for the week anchored around current device day
function generateWeeklyCalendar(): EconomicEventItem[] {
  const now = new Date();
  const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const dayMs = 86400000;
  const hourMs = 3600000;

  return [
    // Today releases
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
    // Tomorrow releases
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

// Reusable Dropdown Select that uses React Portal to avoid widget overflow clipping per design.md §4
function PortalSelect({
  label,
  valueDisplay,
  isOpen,
  onToggle,
  onClose,
  children
}: {
  label: string;
  valueDisplay: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 230 && rect.top > 230;

      const left = Math.max(12, Math.min(rect.left, window.innerWidth - 270));
      const width = Math.max(rect.width, 240);

      if (openUpwards) {
        setCoords({
          bottom: window.innerHeight - rect.top + 6,
          left,
          width,
        });
      } else {
        setCoords({
          top: rect.bottom + 6,
          left,
          width,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="w-full relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "w-full h-10 sm:h-11 rounded-[18px] bg-canvas border px-3 flex items-center justify-between text-xs sm:text-sm transition-all cursor-pointer",
          isOpen ? "border-blue-500 ring-1 ring-blue-500/30" : "border-border-card hover:border-blue-500/40"
        )}
      >
        <span className="text-text-muted font-medium shrink-0">{label}:</span>
        <span className="font-semibold text-text-main truncate mx-2 text-right flex-1">{valueDisplay}</span>
        <ChevronDown size={15} className={cn("text-text-muted transition-transform shrink-0", isOpen && "rotate-180 text-blue-500")} />
      </button>

      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <div
            style={{
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="fixed z-50 bg-card border border-border-card rounded-[18px] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export function EconomicNewsWidget({ size }: WidgetProps) {
  const [events] = useState<EconomicEventItem[]>(generateWeeklyCalendar);
  const [now, setNow] = useState<number>(Date.now());
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Active filters
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([...ALL_CURRENCIES]);
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>(['HIGH', 'MED']);

  // Temporary filters on back card
  const [tempCurrencies, setTempCurrencies] = useState<string[]>([...ALL_CURRENCIES]);
  const [tempImpacts, setTempImpacts] = useState<string[]>(['HIGH', 'MED']);

  // Dropdown open states for back card
  const [currencySelectOpen, setCurrencySelectOpen] = useState(false);
  const [impactSelectOpen, setImpactSelectOpen] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedCurrs = localStorage.getItem('dashboard_news_currencies_v2');
      if (savedCurrs) {
        const parsed = JSON.parse(savedCurrs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCurrencies(parsed);
          setTempCurrencies(parsed);
        }
      }
      const savedImps = localStorage.getItem('dashboard_news_impacts_v2');
      if (savedImps) {
        const parsed = JSON.parse(savedImps);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedImpacts(parsed);
          setTempImpacts(parsed);
        }
      }
    } catch (e) {}
  }, []);

  // Sync temp filters when opening back card
  useEffect(() => {
    if (isFlipped) {
      setTempCurrencies(selectedCurrencies);
      setTempImpacts(selectedImpacts);
      setCurrencySelectOpen(false);
      setImpactSelectOpen(false);
    }
  }, [isFlipped, selectedCurrencies, selectedImpacts]);

  // Live timer ticking every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter events according to user preferences
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
    return upcoming[0] || filteredEvents[0];
  }, [filteredEvents, now]);

  // Format event date & time in device local timezone
  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const isToday = date.toDateString() === new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { localTime, dayLabel };
  };

  // Real-time relative countdown
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

  // Toggle currency in temp state
  const handleToggleTempCurrency = (curr: string) => {
    setTempCurrencies(prev => 
      prev.includes(curr) 
        ? (prev.length > 1 ? prev.filter(c => c !== curr) : prev)
        : [...prev, curr]
    );
  };

  const handleToggleAllCurrencies = () => {
    if (tempCurrencies.length === ALL_CURRENCIES.length) {
      setTempCurrencies(['USD']);
    } else {
      setTempCurrencies([...ALL_CURRENCIES]);
    }
  };

  // Toggle impact in temp state
  const handleToggleTempImpact = (imp: string) => {
    setTempImpacts(prev => 
      prev.includes(imp) 
        ? (prev.length > 1 ? prev.filter(i => i !== imp) : prev)
        : [...prev, imp]
    );
  };

  // Save filters & flip back
  const handleSaveFilters = () => {
    setSelectedCurrencies(tempCurrencies);
    setSelectedImpacts(tempImpacts);
    localStorage.setItem('dashboard_news_currencies_v2', JSON.stringify(tempCurrencies));
    localStorage.setItem('dashboard_news_impacts_v2', JSON.stringify(tempImpacts));
    setCurrencySelectOpen(false);
    setImpactSelectOpen(false);
    setIsFlipped(false);
  };

  // News items to display (large size supports up to 8 items with scroll)
  const displayedEvents = filteredEvents.slice(0, 8);

  return (
    <div className="w-full h-full relative select-none" style={{ perspective: 1000 }}>
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
        onAnimationStart={() => setIsAnimating(true)}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        {/* FRONT CARD */}
        <div
          className={cn(
            "w-full h-full",
            isFlipped ? "pointer-events-none" : "pointer-events-auto"
          )}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {size === 'small' ? (
            <WidgetCard size={size} className="justify-between text-left p-3 sm:p-3.5">
              {!nextEvent ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">News</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped(true);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>
                  <div className="my-auto text-center">
                    <div className="text-sm font-semibold text-text-main">No Events</div>
                    <div className="text-[0.6875rem] text-text-muted mt-0.5">Check filters</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded-[8px] text-xs font-mono font-bold",
                        getCurrencyStyle(nextEvent.currency)
                      )}>
                        {nextEvent.currency}
                      </span>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        nextEvent.timestamp - now > 0 && nextEvent.timestamp - now <= 1800000 
                          ? "bg-rose-500 animate-pulse" 
                          : "bg-emerald-500"
                      )} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped(true);
                      }}
                      title="Filter currencies and impact"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>

                  <div className="my-auto">
                    <div className="font-bold text-sm text-text-main truncate" title={nextEvent.title}>
                      {nextEvent.title}
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex items-center gap-1.5 font-mono">
                      <span>{formatEventTime(nextEvent.timestamp).dayLabel} {formatEventTime(nextEvent.timestamp).localTime}</span>
                      <span>•</span>
                      <span className={cn(
                        "font-semibold",
                        nextEvent.timestamp - now > 0 && nextEvent.timestamp - now <= 1800000
                          ? "text-rose-500 animate-pulse"
                          : "text-blue-500"
                      )}>
                        {getCountdownStr(nextEvent.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted border-t border-border-card/50 pt-1.5 font-mono">
                    <span>Exp: <strong className="text-text-main">{nextEvent.forecast}</strong></span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
                      nextEvent.impact === 'HIGH' 
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25" 
                        : nextEvent.impact === 'MED'
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                    )}>
                      {nextEvent.impact}
                    </span>
                  </div>
                </>
              )}
            </WidgetCard>
          ) : (
            <WidgetCard 
              title="Economic Calendar" 
              size={size}
              action={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  title="Configure news filters"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
                >
                  <SlidersHorizontal size={14} />
                </button>
              }
            >
              {/* Strictly News Items List (2 items in medium size, clean & spacious) */}
              <div className={cn(
                "flex flex-col gap-2 flex-1 justify-center",
                size === 'large' && "overflow-y-auto custom-scrollbar max-h-[340px] justify-start"
              )}>
                {displayedEvents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <Globe size={22} className="text-text-muted mb-1" />
                    <span className="text-xs text-text-muted">No releases matching chosen filters</span>
                  </div>
                ) : (
                  displayedEvents.map(ev => {
                    const isHigh = ev.impact === 'HIGH';
                    const isMed = ev.impact === 'MED';
                    const { localTime, dayLabel } = formatEventTime(ev.timestamp);
                    const countdown = getCountdownStr(ev.timestamp);
                    const isUrgent = ev.timestamp - now > 0 && ev.timestamp - now <= 1800000;

                    return (
                      <div 
                        key={ev.id}
                        className="flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-[16px] bg-canvas border border-border-card text-xs hover:border-blue-500/40 transition-colors shadow-2xs gap-2 min-w-0"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <div className="font-mono text-text-muted shrink-0 text-left min-w-[48px]">
                            <span className="font-bold text-text-main text-xs sm:text-sm tabular-nums">{localTime}</span>
                            <span className="text-[10px] font-medium block text-text-muted leading-none mt-0.5">{dayLabel}</span>
                          </div>
                          <span className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded-[8px] font-mono font-bold text-[11px] sm:text-xs shrink-0",
                            getCurrencyStyle(ev.currency)
                          )}>
                            {ev.currency}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-text-main truncate block text-xs sm:text-sm">
                              {ev.title}
                            </span>
                            <span className={cn(
                              "text-[11px] font-mono font-semibold",
                              isUrgent ? "text-rose-500 animate-pulse" : "text-blue-500"
                            )}>
                              {countdown}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
                            isHigh 
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25" 
                              : isMed 
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                          )}>
                            {ev.impact}
                          </span>
                          {ev.forecast && ev.forecast !== '—' && (
                            <div className="font-mono text-text-muted text-xs font-medium hidden sm:block">
                              Exp: {ev.forecast}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </WidgetCard>
          )}
        </div>

        {/* BACK CARD (FLIPPED 180 DEG - MULTI-SELECT SETTINGS VIA PORTALS) */}
        <div
          className={cn(
            "w-full h-full absolute inset-0",
            !isFlipped ? "pointer-events-none" : "pointer-events-auto"
          )}
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <WidgetCard size={size} className="justify-between">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 mb-1">
              <span className="text-xs sm:text-sm font-bold text-text-main">News Filters</span>
              <button
                type="button"
                onClick={() => {
                  setCurrencySelectOpen(false);
                  setImpactSelectOpen(false);
                  setIsFlipped(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Settings Body with Dropdown Selects that open outside the card via Portal */}
            <div className="my-auto flex flex-col gap-2.5 py-1 w-full">
              {/* Currency Select */}
              <PortalSelect
                label="Currencies"
                valueDisplay={
                  tempCurrencies.length === ALL_CURRENCIES.length 
                    ? 'All Currencies (7)' 
                    : tempCurrencies.join(', ')
                }
                isOpen={currencySelectOpen}
                onToggle={() => {
                  setImpactSelectOpen(false);
                  setCurrencySelectOpen(prev => !prev);
                }}
                onClose={() => setCurrencySelectOpen(false)}
              >
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-border-card/40 mb-1">
                    <span className="text-[11px] font-bold text-text-muted uppercase">Currencies</span>
                    <button
                      type="button"
                      onClick={handleToggleAllCurrencies}
                      className="text-xs font-semibold text-blue-500 hover:underline cursor-pointer"
                    >
                      {tempCurrencies.length === ALL_CURRENCIES.length ? 'Reset' : 'Select All'}
                    </button>
                  </div>
                  {ALL_CURRENCIES.map(curr => {
                    const isSelected = tempCurrencies.includes(curr);
                    return (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => handleToggleTempCurrency(curr)}
                        className={cn(
                          "h-9 px-2.5 rounded-[14px] flex items-center justify-between text-xs font-medium transition-colors cursor-pointer active:scale-95",
                          isSelected ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-text-main hover:bg-canvas"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("px-1.5 py-0.5 rounded-[6px] font-mono font-bold text-[11px]", getCurrencyStyle(curr))}>
                            {curr}
                          </span>
                          <span>{curr === 'USD' ? 'US Dollar' : curr === 'EUR' ? 'Euro' : curr === 'GBP' ? 'British Pound' : curr === 'JPY' ? 'Japanese Yen' : curr === 'CAD' ? 'Canadian Dollar' : curr === 'AUD' ? 'Australian Dollar' : 'Swiss Franc'}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-blue-500" />}
                      </button>
                    );
                  })}
                </div>
              </PortalSelect>

              {/* Impact Select */}
              <PortalSelect
                label="Impact"
                valueDisplay={
                  tempImpacts.length === ALL_IMPACTS.length
                    ? 'All Impacts'
                    : tempImpacts.map(i => i === 'HIGH' ? 'High' : i === 'MED' ? 'Med' : 'Low').join(', ')
                }
                isOpen={impactSelectOpen}
                onToggle={() => {
                  setCurrencySelectOpen(false);
                  setImpactSelectOpen(prev => !prev);
                }}
                onClose={() => setImpactSelectOpen(false)}
              >
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1 border-b border-border-card/40 mb-1">
                    <span className="text-[11px] font-bold text-text-muted uppercase">Impact Level</span>
                  </div>
                  {[
                    { id: 'HIGH', label: 'High Impact', dot: 'bg-rose-500' },
                    { id: 'MED', label: 'Medium Impact', dot: 'bg-amber-500' },
                    { id: 'LOW', label: 'Low Impact', dot: 'bg-blue-500' },
                  ].map(imp => {
                    const isSelected = tempImpacts.includes(imp.id);
                    return (
                      <button
                        key={imp.id}
                        type="button"
                        onClick={() => handleToggleTempImpact(imp.id)}
                        className={cn(
                          "h-9 px-2.5 rounded-[14px] flex items-center justify-between text-xs font-medium transition-colors cursor-pointer active:scale-95",
                          isSelected ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-text-main hover:bg-canvas"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", imp.dot)} />
                          <span>{imp.label}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-blue-500" />}
                      </button>
                    );
                  })}
                </div>
              </PortalSelect>
            </div>

            {/* Action Button */}
            <div className="w-full shrink-0 pt-1">
              <button
                type="button"
                onClick={handleSaveFilters}
                className="w-full h-10 rounded-[18px] bg-blue-500 text-white hover:bg-blue-600 text-sm font-semibold transition-all shadow-sm cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                <span>Apply</span>
              </button>
            </div>
          </WidgetCard>
        </div>
      </motion.div>
    </div>
  );
}

