import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BookMarked,
  Image as ImageIcon,
  Lightbulb,
  Clock,
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
  const date = isTrade ? trade.trade_date : idea.created_at;
  const notes = isTrade ? trade.notes : idea.notes;
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
      badgeText = 'Invalidated';
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

  // Плавная задержка появления для первых 8 элементов (Stagger вход)
  const staggerDelay = Math.min(index * 0.025, 0.2);

  if (viewMode === 'list') {
    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClick}
        className={cn(
          "bg-card border border-border-card transition-colors cursor-pointer rounded-[18px]",
          isTrade ? "hover:border-blue-500/50" : "hover:border-amber-500/50"
        )}
      >
        {/* Desktop List Row */}
        <div className="hidden md:flex items-center justify-between gap-4 h-16 px-4 w-full">
          <div className="flex items-center gap-2.5 w-64 shrink-0">
            <div
              className={cn(
                "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}
            >
              {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>

            <span className="text-sm font-bold text-text-main tracking-tight truncate w-18 shrink-0">{symbol}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0 min-w-[2.25rem] text-center", badgeClasses)}>
              {badgeText}
            </span>
            {isTrade && trade.session && (
              <span className="px-1.5 py-0.5 rounded-[14px] bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono font-medium uppercase shrink-0">
                {SESSION_LABELS[trade.session] || trade.session}
              </span>
            )}
            {isTrade && trade.idea_id && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[14px] bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0" title="Created from Watchlist Idea">
                <Lightbulb size={11} />
                <span>Idea</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="font-mono tabular-nums text-[0.6875rem] text-text-muted shrink-0 w-20">
              {new Date(date).toLocaleDateString()}
            </span>

            {isTrade && trade.setup_id && playbooks[trade.setup_id] && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[14px] bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium truncate max-w-[140px]">
                <BookMarked size={11} className="shrink-0" />
                <span className="truncate">{playbooks[trade.setup_id]}</span>
              </span>
            )}

            {isTrade && trade.mistake_ids && trade.mistake_ids.map((id) => mistakes[id] ? (
              <span key={id} className="px-2 py-0.5 rounded-[14px] bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium truncate max-w-[110px]">
                {mistakes[id]}
              </span>
            ) : null)}

            {!isTrade && notes && (
              <span className="text-xs text-text-muted truncate max-w-[280px]">
                {notes}
              </span>
            )}
          </div>

          {isTrade ? (
            <div className="w-28 shrink-0 flex flex-col justify-center gap-0.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[0.6875rem] text-text-muted font-normal">Risk</span>
                <span className="font-mono tabular-nums font-semibold text-text-main">
                  {trade.risk_percent !== null && trade.risk_percent !== undefined ? `${trade.risk_percent}%` : '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[0.6875rem] text-text-muted font-normal">RR</span>
                <span className="font-mono tabular-nums font-medium text-text-muted">
                  {trade.rr ? `1:${trade.rr}` : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-28 shrink-0 flex flex-col justify-center gap-0.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[0.6875rem] text-text-muted font-normal">
                  {ideaEffectiveStatus === 'active' ? 'Time Left' : 'Status'}
                </span>
                <span className={cn(
                  "font-mono tabular-nums text-xs font-semibold",
                  ideaEffectiveStatus === 'active' ? "text-amber-500" :
                  ideaEffectiveStatus === 'executed' ? "text-emerald-500" : "text-text-muted"
                )}>
                  {ideaEffectiveStatus === 'active' ? (ideaRemaining || 'Active') : ideaEffectiveStatus === 'executed' ? 'Executed' : ideaEffectiveStatus === 'expired' ? 'Expired' : 'Invalid'}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-[0.6875rem] text-text-muted font-normal">State</span>
                <span className="text-[0.6875rem] text-text-muted font-medium capitalize">
                  {ideaEffectiveStatus === 'active' ? 'Active' : 'Closed'}
                </span>
              </div>
            </div>
          )}

          {isTrade ? (
            <div className="w-24 shrink-0 flex flex-col justify-center items-end text-right">
              <div className={cn(
                "text-sm font-bold font-mono tabular-nums leading-tight",
                pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
              )}>
                {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
              </div>
              <div className={cn(
                "text-[0.6875rem] font-mono tabular-nums leading-tight mt-0.5",
                pnlPct !== null && pnlPct !== undefined
                  ? (pnlPct > 0 ? "text-emerald-500/80" : pnlPct < 0 ? "text-rose-500/80" : "text-text-muted")
                  : "text-text-muted/30"
              )}>
                {pnlPct !== null && pnlPct !== undefined
                  ? (pnlPct > 0 ? `+${pnlPct}%` : `${pnlPct}%`)
                  : '—'}
              </div>
            </div>
          ) : (
            <div className="w-24 shrink-0 flex flex-col justify-center items-end text-right">
              <span className="text-xs text-text-muted/30 font-mono">—</span>
            </div>
          )}

          <div className="w-10 shrink-0 flex justify-end">
            {screenshots.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(screenshots, 0, `${symbol} Screenshots`);
                }}
                className="relative w-10 h-10 rounded-[12px] overflow-hidden border border-border-card bg-canvas group cursor-pointer"
              >
                <img src={screenshots[0]} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                {screenshots.length > 1 && (
                  <span className="absolute bottom-0 right-0 px-1 rounded-tl-[4px] bg-black/75 text-white text-[0.6875rem] font-mono tabular-nums">
                    +{screenshots.length - 1}
                  </span>
                )}
              </button>
            ) : (
              <div className="w-10 h-10 rounded-[12px] border border-dashed border-border-card/40 flex items-center justify-center text-text-muted/30">
                <ImageIcon size={14} />
              </div>
            )}
          </div>
        </div>

        {/* Mobile List Row */}
        <div className="flex md:hidden items-center justify-between gap-2.5 w-full px-3 h-[4.5rem] min-h-[4.5rem] max-h-[4.5rem]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={cn(
                "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}
            >
              {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <span className="text-sm font-bold text-text-main shrink-0">{symbol}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0", badgeClasses)}>
                  {badgeText}
                </span>
                {isTrade && trade.session && (
                  <span className="px-1.5 py-0.5 rounded-[10px] bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono uppercase shrink-0">
                    {SESSION_LABELS[trade.session] || trade.session}
                  </span>
                )}
                {isTrade && trade.idea_id && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[10px] bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0">
                    <Lightbulb size={10} />
                    <span>Idea</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted truncate">
                <span className="font-mono tabular-nums shrink-0">{new Date(date).toLocaleDateString()}</span>
                {isTrade && trade.setup_id && playbooks[trade.setup_id] && (
                  <>
                    <span className="text-border-card shrink-0">•</span>
                    <span className="text-blue-500 truncate">{playbooks[trade.setup_id]}</span>
                  </>
                )}
                {!isTrade && notes && (
                  <>
                    <span className="text-border-card shrink-0">•</span>
                    <span className="text-text-muted truncate">{notes}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right flex flex-col justify-center">
              {isTrade ? (
                <>
                  <div className={cn(
                    "text-sm font-bold font-mono tabular-nums leading-tight",
                    pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
                  )}>
                    {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[0.6875rem] text-text-muted mt-0.5">
                    <span>Risk <strong className="font-mono tabular-nums font-medium text-text-main">{trade.risk_percent !== null && trade.risk_percent !== undefined ? `${trade.risk_percent}%` : '—'}</strong></span>
                    <span className="text-border-card">•</span>
                    <span>RR <strong className="font-mono tabular-nums font-medium text-text-main">{trade.rr ? `1:${trade.rr}` : '—'}</strong></span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-amber-500 font-mono tabular-nums flex items-center justify-end gap-1 font-semibold leading-tight">
                    {ideaEffectiveStatus === 'active' && ideaRemaining ? (
                      <>
                        <Clock size={11} />
                        <span>{ideaRemaining}</span>
                      </>
                    ) : (
                      <span className="capitalize text-text-muted">{ideaEffectiveStatus}</span>
                    )}
                  </div>
                  <div className="text-[0.6875rem] text-text-muted/60 font-mono mt-0.5">
                    {ideaEffectiveStatus === 'active' ? 'Active' : 'Ended'}
                  </div>
                </>
              )}
            </div>

            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              {screenshots.length > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick(screenshots, 0, `${symbol} Screenshots`);
                  }}
                  className="relative w-9 h-9 rounded-[10px] overflow-hidden border border-border-card bg-canvas cursor-pointer shrink-0"
                >
                  <img src={screenshots[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                  {screenshots.length > 1 && (
                    <span className="absolute bottom-0 right-0 px-0.5 rounded-tl-[3px] bg-black/80 text-white text-[0.6875rem] font-mono">
                      +{screenshots.length - 1}
                    </span>
                  )}
                </button>
              ) : (
                <div className="w-9 h-9 rounded-[10px] border border-dashed border-border-card/40 flex items-center justify-center text-text-muted/20 shrink-0">
                  <ImageIcon size={12} />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        "bg-card border border-border-card transition-colors cursor-pointer flex p-4 rounded-[26px] flex-col justify-between min-h-[180px] h-full",
        isTrade ? "hover:border-blue-500/50" : "hover:border-amber-500/50"
      )}
    >
      {/* Шапка тикета */}
      <div className="flex items-center justify-between gap-3 w-full pb-3 border-b border-border-card/60">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-bold tracking-tight text-text-main truncate">{symbol}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0", badgeClasses)}>
              {badgeText}
            </span>
            {isTrade && trade.session && (
              <span className="px-1.5 py-0.5 rounded-[14px] bg-canvas text-text-muted border border-border-card text-[0.6875rem] font-mono font-semibold uppercase shrink-0">
                {SESSION_LABELS[trade.session] || trade.session}
              </span>
            )}
            {isTrade && trade.idea_id && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[14px] bg-amber-500/10 text-amber-500 text-[0.6875rem] font-semibold shrink-0">
                <Lightbulb size={11} />
                <span>Idea</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {isTrade ? (
            <div className="flex flex-col items-end leading-tight">
              <span className={cn(
                "text-sm font-bold font-mono tabular-nums",
                pnlR > 0 ? "text-emerald-500" : pnlR < 0 ? "text-rose-500" : "text-text-muted"
              )}>
                {pnlR > 0 ? `+${pnlR} R` : `${pnlR} R`}
              </span>
              <span className={cn(
                "text-[0.6875rem] font-mono tabular-nums mt-0.5",
                pnlPct !== null && pnlPct !== undefined
                  ? (pnlPct > 0 ? "text-emerald-500/80" : pnlPct < 0 ? "text-rose-500/80" : "text-text-muted")
                  : "text-text-muted/30"
              )}>
                {pnlPct !== null && pnlPct !== undefined
                  ? (pnlPct > 0 ? `+${pnlPct}%` : `${pnlPct}%`)
                  : '—'}
              </span>
            </div>
          ) : (
            ideaEffectiveStatus === 'active' && ideaRemaining ? (
              <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-semibold text-amber-500">
                <Clock size={12} />
                <span>{ideaRemaining}</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Тело тикета */}
      <div className="flex items-start justify-between gap-3 my-auto py-2.5 w-full">
        <div className="flex-1 min-w-0 space-y-2">
          {isTrade && (trade.setup_id || (trade.mistake_ids && trade.mistake_ids.length > 0)) ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {trade.setup_id && playbooks[trade.setup_id] && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[14px] bg-blue-500/10 text-blue-500 text-[0.6875rem] font-medium truncate max-w-[130px]">
                  <BookMarked size={11} />
                  <span className="truncate">{playbooks[trade.setup_id]}</span>
                </span>
              )}
              {trade.mistake_ids && trade.mistake_ids.map((id) => mistakes[id] ? (
                <span key={id} className="px-2 py-0.5 rounded-[14px] bg-rose-500/10 text-rose-500 text-[0.6875rem] font-medium truncate max-w-[100px]">
                  {mistakes[id]}
                </span>
              ) : null)}
            </div>
          ) : null}

          {notes ? (
            <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-normal">
              {notes}
            </p>
          ) : (
            <p className="text-xs text-text-muted/40 italic font-normal">
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
            className="relative w-16 h-14 rounded-[12px] overflow-hidden border border-border-card bg-canvas shrink-0 group/img cursor-pointer shadow-xs"
          >
            <img
              src={screenshots[0]}
              alt="Preview"
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
            />
            {screenshots.length > 1 && (
              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/75 text-white text-[0.6875rem] font-mono tabular-nums flex items-center gap-0.5">
                <ImageIcon size={9} />
                {screenshots.length}
              </span>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ImageIcon size={14} />
            </div>
          </div>
        )}
      </div>

      {/* Футер тикета */}
      <div className="pt-2 border-t border-border-card/60 w-full flex items-center justify-between text-[0.6875rem]">
        {isTrade ? (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 text-text-muted">
              <span>Risk</span>
              <span className="font-mono tabular-nums font-semibold text-text-main">{trade.risk_percent}%</span>
            </div>
            <span className="text-border-card/80">•</span>
            <div className="flex items-center gap-1 text-text-muted">
              <span>RR</span>
              <span className="font-mono tabular-nums font-semibold text-text-main">1:{trade.rr}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted">
            <Lightbulb size={12} className="text-amber-500" />
            <span>Watchlist Idea</span>
          </div>
        )}
        <div className="font-mono tabular-nums text-text-muted">
          {new Date(date).toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}

