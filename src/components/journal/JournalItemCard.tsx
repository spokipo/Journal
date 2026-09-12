import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BookMarked,
  Image as ImageIcon,
  Lightbulb,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  SESSION_LABELS,
  getPnlR,
  getEffectiveIdeaStatus,
  formatIdeaRemainingTime,
  type TradeRecord,
  type IdeaRecord,
  type ViewMode,
} from './types';

interface ExtraBadgeItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  classes: string;
}

function ExtraBadgesPill({
  badges,
  placement = 'bottom',
  onActiveChange,
}: {
  badges: ExtraBadgeItem[];
  placement?: 'bottom' | 'right';
  onActiveChange?: (active: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = isOpen || isHovered;

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

  if (!badges || badges.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center shrink-0", isActive ? "z-50" : "z-20")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={`${badges.length} additional tags`}
        className={cn(
          "h-5 px-1.5 min-w-[1.75rem] rounded-full text-[0.6875rem] font-bold font-mono tracking-tight transition-all cursor-pointer select-none flex items-center justify-center shrink-0 shadow-2xs active:scale-95",
          isActive
            ? "bg-card text-text-main border border-blue-500 shadow-xs ring-1 ring-blue-500/30"
            : "bg-canvas text-text-muted hover:text-text-main hover:bg-card border border-border-card"
        )}
      >
        +{badges.length}
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'bottom' ? -4 : 0, x: placement === 'right' ? -6 : 0, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'bottom' ? -4 : 0, x: placement === 'right' ? -6 : 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute z-50 p-2 bg-card border border-border-card rounded-[18px] shadow-2xl flex flex-wrap gap-1.5 min-w-[150px] max-w-[240px] pointer-events-auto",
              placement === 'bottom'
                ? "left-0 top-full mt-1.5 before:absolute before:left-0 before:-top-2 before:right-0 before:h-2 before:content-['']"
                : "left-full top-1/2 -translate-y-1/2 ml-1.5 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2 before:content-['']"
            )}
          >
            {badges.map((b) => (
              <span
                key={b.id}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium whitespace-nowrap shadow-2xs",
                  b.classes
                )}
              >
                {b.icon}
                <span>{b.label}</span>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface JournalItemCardProps {
  item: TradeRecord | IdeaRecord;
  type: 'trade' | 'idea';
  index: number;
  viewMode: ViewMode;
  now: number;
  playbooks: Record<string, string>;
  mistakes: Record<string, string>;
  onClick: () => void;
  onImageClick: (images: string[], index: number, title?: string) => void;
}

export function JournalItemCard({
  item,
  type,
  index,
  viewMode,
  now,
  playbooks,
  mistakes,
  onClick,
  onImageClick,
}: JournalItemCardProps) {
  const isTrade = type === 'trade';
  const trade = item as TradeRecord;
  const idea = item as IdeaRecord;

  const rawDirection = (isTrade ? trade.direction : idea.direction) || (item as any).side || (item as any).type || '';
  const dirUpper = String(rawDirection).trim().toUpperCase();
  const isLong = ['LONG', 'BUY', 'B', 'UP'].includes(dirUpper);

  const symbol = isTrade ? trade.symbol : idea.symbol;
  const session = isTrade ? trade.session : (idea.session || null);
  const date = isTrade ? trade.trade_date : idea.created_at;
  const notes = (isTrade ? trade.notes : idea.notes)?.trim() || null;
  const screenshots = (isTrade ? trade.screenshots : idea.screenshots) || [];

  const ideaEffectiveStatus = !isTrade ? getEffectiveIdeaStatus(idea, now) : 'active';
  const ideaRemaining = !isTrade ? formatIdeaRemainingTime(idea.expires_at, now) : null;

  let badgeText = '';
  let badgeClasses = '';

  if (isTrade) {
    badgeText = trade.outcome;
    badgeClasses =
      trade.outcome === 'TP'
        ? 'bg-emerald-500/10 text-emerald-500'
        : trade.outcome === 'SL'
          ? 'bg-rose-500/10 text-rose-500'
          : 'bg-amber-500/10 text-amber-500';
  } else {
    if (ideaEffectiveStatus === 'executed') {
      badgeText = 'Executed';
      badgeClasses = 'bg-emerald-500/10 text-emerald-500';
    } else if (ideaEffectiveStatus === 'invalidated') {
      badgeText = 'Invalid';
      badgeClasses = 'bg-rose-500/10 text-rose-500';
    } else if (ideaEffectiveStatus === 'expired') {
      badgeText = 'Expired';
      badgeClasses = 'bg-canvas text-text-muted border border-border-card';
    } else {
      badgeText = 'Active';
      badgeClasses = 'bg-amber-500/10 text-amber-500';
    }
  }

  const pnlR = isTrade ? getPnlR(trade) : 0;
  const pnlPct = isTrade
    ? trade.pnl_percent !== null && trade.pnl_percent !== undefined
      ? trade.pnl_percent
      : trade.risk_percent
        ? Number((pnlR * trade.risk_percent).toFixed(2))
        : null
    : null;

  // Stagger-анимация по правилу §3.1 (delay = (index % 12) * 0.035s, capped на 0.24s)
  const staggerDelay = Math.min((index % 12) * 0.035, 0.24);

  const rawTf = isTrade ? trade.timeframe : null;
  const cleanTf = rawTf ? rawTf.replace(/\s*tf\s*/i, '').trim() : null;

  const extraBadges = useMemo(() => {
    const list: ExtraBadgeItem[] = [];
    if (session) {
      list.push({
        id: 'session',
        label: `${SESSION_LABELS[session] || session} Session`,
        icon: <Clock size={11} className="shrink-0" />,
        classes: 'bg-canvas text-text-muted border border-border-card',
      });
    }
    if (isTrade && cleanTf) {
      list.push({
        id: 'timeframe',
        label: `${cleanTf} TF`,
        icon: <Layers size={11} className="shrink-0" />,
        classes: 'bg-canvas text-text-muted border border-border-card',
      });
    }
    if (isTrade && trade.idea_id) {
      list.push({
        id: 'idea',
        label: 'Watchlist Idea',
        icon: <Lightbulb size={11} className="shrink-0 text-amber-500" />,
        classes: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold',
      });
    }
    if (isTrade && trade.mistake_ids && trade.mistake_ids.length > 0) {
      trade.mistake_ids.forEach((mId) => {
        if (mistakes[mId]) {
          list.push({
            id: `mistake-${mId}`,
            label: mistakes[mId],
            icon: <AlertTriangle size={11} className="shrink-0 text-rose-500" />,
            classes: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
          });
        }
      });
    }
    return list;
  }, [isTrade, session, cleanTf, trade?.idea_id, trade?.mistake_ids, mistakes]);

  const [isPillActive, setIsPillActive] = useState(false);

  // ==========================================
  // 1. LIST VIEW
  // ==========================================
  if (viewMode === 'list') {
    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={0}
        role="button"
        className={cn(
          "group bg-card border border-border-card transition-colors cursor-pointer rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isTrade ? "hover:border-blue-500/50" : "hover:border-amber-500/50",
          isPillActive ? "relative z-40" : "relative z-0"
        )}
      >
        {/* Desktop List Row: Single-line row evenly divided across all variables */}
        <div className="hidden md:flex items-center justify-between gap-3 h-16 px-4 w-full text-xs">
          {/* 1. Direction & Symbol (w-32 shrink-0) */}
          <div className="flex items-center gap-2.5 w-32 shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0",
                isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}
            >
              {isLong ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <span className="text-sm font-bold text-text-main tracking-tight truncate">
              {symbol}
            </span>
          </div>

          {/* 2. Date (w-20 shrink-0) */}
          <div className="w-20 shrink-0 font-mono tabular-nums text-[0.6875rem] text-text-muted">
            {new Date(date).toLocaleDateString()}
          </div>

          {/* 3. Outcome / Status (w-14 shrink-0 flex justify-center) */}
          <div className="w-14 shrink-0 flex justify-center">
            <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0 min-w-[2.25rem] text-center", badgeClasses)}>
              {badgeText}
            </span>
          </div>

          {/* 4. Session (w-20 shrink-0 flex justify-center) */}
          <div className="w-20 shrink-0 flex justify-center">
            {session ? (
              <span className="px-2 py-0.5 rounded-full bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono font-medium uppercase truncate">
                {SESSION_LABELS[session] || session}
              </span>
            ) : null}
          </div>

          {/* 5. Timeframe (w-12 shrink-0 flex justify-center) */}
          <div className="w-12 shrink-0 flex justify-center">
            {cleanTf ? (
              <span className="px-2 py-0.5 rounded-full bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono font-medium">
                {cleanTf}
              </span>
            ) : null}
          </div>

          {/* 6. Setup / Strategy (flex-1 min-w-[110px] max-w-[180px] shrink-0 truncate) */}
          <div className="flex-1 min-w-[110px] max-w-[180px] shrink-0 truncate">
            {isTrade && trade.setup_id && playbooks[trade.setup_id] ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium truncate max-w-full" title={playbooks[trade.setup_id]}>
                <BookMarked size={11} className="shrink-0" />
                <span className="truncate">{playbooks[trade.setup_id]}</span>
              </span>
            ) : isTrade && trade.idea_id ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0">
                <Lightbulb size={11} className="shrink-0" />
                <span>Idea</span>
              </span>
            ) : null}
          </div>

          {/* 7. Mistakes (w-24 shrink-0 truncate) */}
          <div className="w-24 shrink-0 truncate">
            {isTrade && trade.mistake_ids && trade.mistake_ids.length > 0 ? (
              <div className="flex items-center gap-1 truncate">
                {trade.mistake_ids.slice(0, 1).map((id) => mistakes[id] ? (
                  <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium truncate" title={mistakes[id]}>
                    <AlertTriangle size={11} className="shrink-0" />
                    <span className="truncate">{mistakes[id]}</span>
                  </span>
                ) : null)}
                {trade.mistake_ids.length > 1 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[0.6875rem] font-mono font-bold shrink-0">
                    +{trade.mistake_ids.length - 1}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {/* 8 & 9. Risk & PnL (trades) vs Status/Timer (ideas) - strictly in one line without dashes */}
          {isTrade ? (
            <>
              <div className="w-14 shrink-0 text-right font-mono tabular-nums text-xs font-semibold text-text-main">
                {trade.risk_percent !== null && trade.risk_percent !== undefined ? `${trade.risk_percent}%` : null}
              </div>

              <div className="w-20 shrink-0 text-right flex flex-col items-end leading-tight">
                <span className={cn(
                  "text-sm font-bold font-mono tabular-nums",
                  pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
                )}>
                  {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
                </span>
                {pnlPct !== null && pnlPct !== undefined ? (
                  <span className={cn(
                    "text-[0.6875rem] font-mono tabular-nums",
                    pnlPct > 0 ? "text-emerald-500/80" : pnlPct < 0 ? "text-rose-500/80" : "text-text-muted"
                  )}>
                    {pnlPct > 0 ? `+${pnlPct}%` : `${pnlPct}%`}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <div className="w-34 shrink-0 text-right flex items-center justify-end">
              {ideaEffectiveStatus === 'active' && ideaRemaining ? (
                <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-semibold text-amber-500 whitespace-nowrap">
                  <Clock size={12} className="shrink-0" />
                  <span>{ideaRemaining}</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-text-muted font-mono capitalize whitespace-nowrap">
                  {ideaEffectiveStatus}
                </span>
              )}
            </div>
          )}

          {/* 10. Thumbnail (w-10 shrink-0 flex justify-end) */}
          <div className="w-10 shrink-0 flex justify-end">
            {screenshots.length > 0 ? (
              <button
                type="button"
                aria-label="View screenshots"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(screenshots, 0, `${symbol} Screenshots`);
                }}
                className="relative w-9 h-9 rounded-[12px] overflow-hidden border border-border-card bg-canvas group/thumb cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <img src={screenshots[0]} alt="Thumbnail" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                {screenshots.length > 1 && (
                  <span className="absolute bottom-0 right-0 px-1 rounded-tl-[6px] bg-black/75 text-white text-[0.625rem] font-mono tabular-nums">
                    +{screenshots.length - 1}
                  </span>
                )}
              </button>
            ) : (
              <div className="w-9 h-9 rounded-[12px] border border-dashed border-border-card/40 flex items-center justify-center text-text-muted/30">
                <ImageIcon size={13} />
              </div>
            )}
          </div>
        </div>

        {/* Mobile List Row: 2-line layout that guarantees session never wraps or gets cut off */}
        <div className="flex md:hidden items-center justify-between gap-3 w-full px-3.5 py-3 min-h-[4.25rem]">
          {/* Direction icon: L0 rounded-[14px] 36x36 */}
          <div
            className={cn(
              "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>

          {/* Main Info: 2 structured rows */}
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
            {/* Top row: Symbol + Outcome + Extra badges vs Primary Metric */}
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-bold text-text-main shrink-0">{symbol}</span>

                <span className={cn("px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0", badgeClasses)}>
                  {badgeText}
                </span>

                <ExtraBadgesPill badges={extraBadges} placement="bottom" onActiveChange={setIsPillActive} />
              </div>

              {/* Top row right: PnL or Idea countdown */}
              {isTrade ? (
                <span className={cn(
                  "text-sm font-bold font-mono tabular-nums shrink-0",
                  pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
                )}>
                  {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
                </span>
              ) : (
                ideaEffectiveStatus === 'active' && ideaRemaining ? (
                  <span className="text-xs font-semibold text-amber-500 font-mono tabular-nums flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Clock size={12} className="shrink-0" />
                    <span>{ideaRemaining}</span>
                  </span>
                ) : (
                  <span className="text-xs text-text-muted font-medium capitalize shrink-0 whitespace-nowrap">
                    {ideaEffectiveStatus}
                  </span>
                )
              )}
            </div>

            {/* Bottom row: Date + Setup/Notes vs Risk / Expiration */}
            <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-text-muted w-full">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="font-mono tabular-nums shrink-0">{new Date(date).toLocaleDateString()}</span>
                {isTrade && trade.setup_id && playbooks[trade.setup_id] ? (
                  <>
                    <span className="text-border-card shrink-0">•</span>
                    <span className="text-blue-500 truncate font-medium">{playbooks[trade.setup_id]}</span>
                  </>
                ) : notes ? (
                  <>
                    <span className="text-border-card shrink-0">•</span>
                    <span className="text-text-muted truncate">{notes}</span>
                  </>
                ) : null}
              </div>

              {/* Bottom row right: Risk or Idea Expiration */}
              {isTrade ? (
                trade.risk_percent !== null && trade.risk_percent !== undefined ? (
                  <div className="flex items-center gap-1 text-[0.6875rem] text-text-muted shrink-0">
                    <span>Risk <strong className="font-mono tabular-nums font-medium text-text-main">{trade.risk_percent}%</strong></span>
                  </div>
                ) : null
              ) : idea.expires_at ? (
                <span className="text-[0.6875rem] text-text-muted font-mono shrink-0 whitespace-nowrap">
                  Exp {new Date(idea.expires_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          </div>

          {/* Mobile Image Hit Area: min-w-11 min-h-11 по §9 */}
          {screenshots.length > 0 && (
            <div className="shrink-0 flex items-center justify-center">
              <button
                type="button"
                aria-label="View screenshots"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(screenshots, 0, `${symbol} Screenshots`);
                }}
                className="min-w-11 min-h-11 flex items-center justify-center cursor-pointer"
              >
                <div className="relative w-9 h-9 rounded-[14px] overflow-hidden border border-border-card bg-canvas">
                  <img src={screenshots[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                  {screenshots.length > 1 && (
                    <span className="absolute bottom-0 right-0 px-1 rounded-tl-[4px] bg-black/80 text-white text-[0.6875rem] font-mono tabular-nums">
                      +{screenshots.length - 1}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // 2. GRID VIEW (Compact L2 Card, 3-column responsive)
  // ==========================================
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      className={cn(
        "group bg-card border border-border-card transition-all cursor-pointer flex p-3.5 sm:p-4 rounded-[26px] flex-col justify-between h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs",
        isTrade ? "hover:border-blue-500/50" : "hover:border-amber-500/50",
        isPillActive ? "relative z-40" : "relative z-0"
      )}
    >
      {/* 1. Header (Identity & Primary Metric) */}
      <div className="flex items-center justify-between gap-2 w-full pb-2.5 border-b border-border-card/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Direction badge: L0 rounded-[14px] 32x32 */}
          <div
            className={cn(
              "w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {isLong ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          </div>

          <span className="text-sm font-bold tracking-tight text-text-main truncate shrink-0">
            {symbol}
          </span>

          <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0", badgeClasses)}>
            {badgeText}
          </span>

          <ExtraBadgesPill badges={extraBadges} placement="bottom" onActiveChange={setIsPillActive} />
        </div>

        {/* Header Right: Primary metric */}
        <div className="text-right shrink-0">
          {isTrade ? (
            <div className="flex flex-col items-end leading-tight">
              <span className={cn(
                "text-sm font-bold font-mono tabular-nums",
                pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
              )}>
                {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
              </span>
              {pnlPct !== null && pnlPct !== undefined ? (
                <span className={cn(
                  "text-[0.6875rem] font-mono tabular-nums mt-0.5",
                  pnlPct > 0 ? "text-emerald-500/80" : pnlPct < 0 ? "text-rose-500/80" : "text-text-muted"
                )}>
                  {pnlPct > 0 ? `+${pnlPct}%` : `${pnlPct}%`}
                </span>
              ) : null}
            </div>
          ) : (
            ideaEffectiveStatus === 'active' && ideaRemaining ? (
              <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-semibold text-amber-500 whitespace-nowrap shrink-0">
                <Clock size={12} className="shrink-0" />
                <span>{ideaRemaining}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-text-muted capitalize font-mono whitespace-nowrap shrink-0">
                {ideaEffectiveStatus}
              </span>
            )
          )}
        </div>
      </div>

      {/* 2. Body (Tags, Notes, Screenshot preview) */}
      <div className="py-2.5 flex-1 flex flex-col justify-between gap-2 w-full">
        {/* Tags Row */}
        {isTrade && trade.setup_id && playbooks[trade.setup_id] ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[10px] bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium truncate max-w-[130px]">
              <BookMarked size={11} />
              <span className="truncate">{playbooks[trade.setup_id]}</span>
            </span>
          </div>
        ) : null}

        {/* Notes & Screenshot Split */}
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex-1 min-w-0">
            {notes ? (
              <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-normal">
                {notes}
              </p>
            ) : (
              <p className="text-xs text-text-muted/30 italic font-normal">
                No notes
              </p>
            )}
          </div>

          {screenshots.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(screenshots, 0, `${symbol} Screenshots`);
              }}
              className="relative w-12 h-9 sm:w-14 sm:h-10 rounded-[14px] overflow-hidden border border-border-card bg-canvas shrink-0 group/img cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <img
                src={screenshots[0]}
                alt="Preview"
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
              />
              {screenshots.length > 1 && (
                <span className="absolute bottom-0.5 right-0.5 px-1 rounded-[4px] bg-black/75 text-white text-[0.6875rem] font-mono tabular-nums">
                  +{screenshots.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Footer (Parameters & Date) - RR 1:... completely removed */}
      <div className="pt-2 border-t border-border-card/60 w-full flex items-center justify-between text-[0.6875rem]">
        {isTrade ? (
          <div className="flex items-center gap-2 text-text-muted">
            {trade.risk_percent !== null && trade.risk_percent !== undefined ? (
              <span>Risk <strong className="font-mono tabular-nums font-semibold text-text-main">{trade.risk_percent}%</strong></span>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-text-muted">
            {session ? (
              <span className="font-mono text-text-muted">{SESSION_LABELS[session] || session}</span>
            ) : idea.expires_at ? (
              <span className="font-mono text-text-muted">Expires {new Date(idea.expires_at).toLocaleDateString()}</span>
            ) : (
              <span className="text-text-muted">Thesis</span>
            )}
          </div>
        )}

        <span className="font-mono tabular-nums text-text-muted">
          {new Date(date).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
}