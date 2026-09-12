import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Lightbulb, 
  Loader2, 
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  RotateCcw,
  Edit3,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Check,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { TickerSelect } from '../ui/TickerSelect';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { TradeModalShell } from './TradeModalShell';
import { DirectionToggle } from './DirectionToggle';
import { ScreenshotsSection } from './ScreenshotsSection';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { useTradeImageUpload } from './useTradeImageUpload';

export type IdeaStatus = 'active' | 'executed' | 'invalidated' | 'expired';

export interface IdeaPayload {
  id?: string;
  user_id?: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  session?: string;
  notes?: string | null;
  screenshots?: string[];
  status?: IdeaStatus | string;
  created_at?: string;
  expires_at?: string | null;
}

interface IdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  editingIdea?: IdeaPayload | null;
  onSuccess?: (idea?: any) => void;
  onConvertToTrade?: (idea: IdeaPayload) => void;
  onDelete?: (id: string) => void;
}

function getCurrentUtcSession(): string {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 0 && utcHour < 7) return 'ASIA';
  if (utcHour >= 7 && utcHour < 12) return 'LONDON';
  if (utcHour >= 12 && utcHour < 21) return 'NEW_YORK';
  return 'OFF_SESSION';
}

export function IdeaModal({
  isOpen,
  onClose,
  user,
  editingIdea,
  onSuccess,
  onConvertToTrade,
  onDelete,
}: IdeaModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('active');
  const [now, setNow] = useState<number>(Date.now());

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);

  // Reusable Image Upload Hook
  const {
    screenshots,
    isUploading,
    uploadError,
    isDragging,
    viewerIndex,
    setViewerIndex,
    fileInputRef,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveScreenshot,
  } = useTradeImageUpload({
    user,
    folder: 'ideas',
    isOpen,
    isEditing,
    initialScreenshots: editingIdea?.screenshots ? (Array.isArray(editingIdea.screenshots) ? editingIdea.screenshots : []) : [],
  });

  // Countdown clock
  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsMobileActionMenuOpen(false);
      setShowDeleteConfirm(false);
      if (editingIdea) {
        setIsEditing(false);
        setSymbol(editingIdea.symbol || '');
        const rawDir = String(editingIdea.direction || '').toUpperCase();
        setDirection(rawDir === 'SHORT' ? 'SHORT' : 'LONG');
        setNotes(editingIdea.notes || '');
        setStatus(editingIdea.status || 'active');
        
        if (editingIdea.expires_at) {
          setExpiresAt(editingIdea.expires_at);
        } else if (editingIdea.created_at) {
          const exp = new Date(new Date(editingIdea.created_at).getTime() + 24 * 60 * 60 * 1000);
          setExpiresAt(exp.toISOString());
        }
      } else {
        setIsEditing(true);
        setSymbol('');
        setDirection('LONG');
        setNotes('');
        setStatus('active');
        setExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      }
      setError(null);
    }
  }, [isOpen, editingIdea]);

  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= now : false;
  const rawStatus = String(status || '').toLowerCase();
  const effectiveStatus: IdeaStatus = (rawStatus === 'executed' || rawStatus === 'triggered')
    ? 'executed'
    : (rawStatus === 'invalidated' || rawStatus === 'cancelled')
      ? 'invalidated'
      : isExpired
        ? 'expired'
        : 'active';

  const getRemainingTimeText = () => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleExtendLife = async () => {
    setIsMobileActionMenuOpen(false);
    const nextExp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setExpiresAt(nextExp);
    setStatus('active');

    if (editingIdea?.id && isSupabaseConfigured) {
      let query = supabase
        .from('ideas')
        .update({ expires_at: nextExp, status: 'active' })
        .eq('id', editingIdea.id);
      if (user?.id) query = query.eq('user_id', user.id);
      await query;
      onSuccess?.({ ...editingIdea, expires_at: nextExp, status: 'active' });
    }
  };

  const handleInvalidate = async () => {
    setIsMobileActionMenuOpen(false);
    setStatus('invalidated');
    if (editingIdea?.id && isSupabaseConfigured) {
      let query = supabase
        .from('ideas')
        .update({ status: 'invalidated' })
        .eq('id', editingIdea.id);
      if (user?.id) query = query.eq('user_id', user.id);
      await query;
      onSuccess?.({ ...editingIdea, status: 'invalidated' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingIdea?.id || !onDelete) return;
    setIsMobileActionMenuOpen(false);
    setIsDeleting(true);
    try {
      await onDelete(editingIdea.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbol) {
      setError('Please select an asset ticker');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const rawSession = editingIdea?.session || getCurrentUtcSession();
      const payload: Record<string, any> = {
        symbol,
        direction,
        session: rawSession.toUpperCase(),
        notes: notes.trim() || null,
        screenshots,
        status: effectiveStatus,
        expires_at: expiresAt,
      };

      if (editingIdea?.id) {
        if (isSupabaseConfigured) {
          let updateQuery = supabase
            .from('ideas')
            .update(payload)
            .eq('id', editingIdea.id);
          if (user?.id) updateQuery = updateQuery.eq('user_id', user.id);
          let { data, error: updateErr } = await updateQuery.select();

          if (updateErr && updateErr.message?.toLowerCase().includes('direction')) {
            const altDir = direction === 'LONG' ? 'long' : 'short';
            let retryQuery = supabase
              .from('ideas')
              .update({ ...payload, direction: altDir })
              .eq('id', editingIdea.id);
            if (user?.id) retryQuery = retryQuery.eq('user_id', user.id);
            const retry = await retryQuery.select();
            if (!retry.error) {
              data = retry.data;
              updateErr = null;
            }
          }

          if (updateErr) throw updateErr;
          onSuccess?.(data?.[0] || { ...editingIdea, ...payload });
        } else {
          onSuccess?.({ ...editingIdea, ...payload });
        }
        setIsEditing(false);
      } else {
        if (isSupabaseConfigured && user?.id) {
          const insertPayload = { ...payload, user_id: user.id };
          let { data, error: insertErr } = await supabase
            .from('ideas')
            .insert([insertPayload])
            .select();

          if (insertErr && insertErr.message?.toLowerCase().includes('direction')) {
            const altDir = direction === 'LONG' ? 'long' : 'short';
            const retry = await supabase
              .from('ideas')
              .insert([{ ...insertPayload, direction: altDir }])
              .select();
            if (!retry.error) {
              data = retry.data;
              insertErr = null;
            }
          }

          if (insertErr) throw insertErr;
          onSuccess?.(data?.[0] || insertPayload);
        } else {
          onSuccess?.(payload);
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      if (err?.message?.includes('ideas_direction_check')) {
        setError('Database error: check constraint "ideas_direction_check" failed.');
      } else {
        setError(err?.message || 'Failed to save trade idea');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    if (editingIdea) {
      setSymbol(editingIdea.symbol || '');
      const rawDir = String(editingIdea.direction || '').toUpperCase();
      setDirection(rawDir === 'SHORT' ? 'SHORT' : 'LONG');
      setNotes(editingIdea.notes || '');
      setIsEditing(false);
      setError(null);
    } else {
      onClose();
    }
  };

  const modalTitle = isEditing 
    ? (editingIdea ? 'Edit Watchlist Idea' : 'New Watchlist Idea')
    : `${symbol || 'Idea'} Watchlist Idea`;

  const mobileTitle = isEditing
    ? (editingIdea ? 'Edit Idea' : 'New Watchlist Idea')
    : `${symbol || 'Idea'} Details`;

  return (
    <>
      <TradeModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        mobileTitle={mobileTitle}
        desktopIcon={<Lightbulb size={20} />}
        desktopIconClass="bg-amber-500/10 text-amber-500"
        onSubmit={isEditing ? handleSubmit : undefined}
        // Mobile Header 3-Slot Actions (per design.md §5)
        mobileLeftAction={{
          icon: <X size={18} />,
          onClick: isEditing ? handleCancelEditing : onClose,
          ariaLabel: isEditing ? 'Cancel editing' : 'Close modal',
        }}
        mobileRightAction={
          isEditing ? (
            {
              icon: isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />,
              onClick: handleSubmit,
              ariaLabel: 'Save idea',
              isPrimary: true,
              disabled: isSaving || isUploading || !symbol,
            }
          ) : (
            // §5 MoreHorizontal menu for secondary actions
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileActionMenuOpen((prev) => !prev)}
                aria-label="More actions"
                className="w-11 h-11 rounded-full bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs flex items-center justify-center transition-all cursor-pointer"
              >
                <MoreHorizontal size={18} />
              </button>

              {/* Anchored Popover Menu complying with §5 Popover rules:
                  - Transparent non-darkening dismiss layer
                  - Scroll NOT locked
                  - Surface L2 (rounded-[18px]), items L0 (rounded-[14px])
                  - Destructive item separated by border-t */}
              {isMobileActionMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                    onClick={() => setIsMobileActionMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-13 w-[200px] bg-card border border-border-card rounded-[18px] p-1.5 shadow-2xl z-50 flex flex-col gap-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileActionMenuOpen(false);
                        setIsEditing(true);
                      }}
                      className="h-11 px-3 rounded-[14px] flex items-center gap-2 text-xs font-medium text-text-main hover:bg-canvas transition-colors text-left w-full cursor-pointer"
                    >
                      <Pencil size={15} className="text-text-muted" />
                      <span>Edit Idea</span>
                    </button>

                    {effectiveStatus === 'active' && onConvertToTrade && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileActionMenuOpen(false);
                          onClose();
                          onConvertToTrade({
                            ...editingIdea,
                            symbol,
                            direction,
                            notes: notes.trim() || null,
                            screenshots,
                          });
                        }}
                        className="h-11 px-3 rounded-[14px] flex items-center gap-2 text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors text-left w-full cursor-pointer"
                      >
                        <Zap size={15} />
                        <span>Execute Trade</span>
                      </button>
                    )}

                    {effectiveStatus === 'active' && (
                      <button
                        type="button"
                        onClick={handleInvalidate}
                        className="h-11 px-3 rounded-[14px] flex items-center gap-2 text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors text-left w-full cursor-pointer"
                      >
                        <Ban size={15} />
                        <span>Invalidate Idea</span>
                      </button>
                    )}

                    {(effectiveStatus === 'invalidated' || effectiveStatus === 'expired') && (
                      <button
                        type="button"
                        onClick={handleExtendLife}
                        className="h-11 px-3 rounded-[14px] flex items-center gap-2 text-xs font-medium text-blue-500 hover:bg-blue-500/10 transition-colors text-left w-full cursor-pointer"
                      >
                        <RotateCcw size={15} />
                        <span>Reactivate (+24h)</span>
                      </button>
                    )}

                    {onDelete && (
                      <>
                        <div className="border-t border-border-card/40 my-0.5" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileActionMenuOpen(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="h-11 px-3 rounded-[14px] flex items-center gap-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left w-full cursor-pointer"
                        >
                          <Trash2 size={15} />
                          <span>Delete Idea</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </div>
          )
        }
        // Desktop Header Actions
        desktopHeaderActions={
          !isEditing && editingIdea && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="h-10 px-4 rounded-full bg-card border border-border-card hover:bg-canvas text-sm font-medium text-text-main flex items-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-xs"
            >
              <Edit3 size={16} />
              <span>Edit</span>
            </button>
          )
        }
        // Desktop Footer Actions
        desktopFooterLeft={
          editingIdea && onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Idea"
              className="h-10 px-4 rounded-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer active:scale-95 disabled:opacity-50 text-sm font-medium"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Delete</span>
            </button>
          )
        }
        desktopFooterRight={
          isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEditing}
                className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploading || !symbol}
                className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {isSaving && <Loader2 size={16} className="animate-spin shrink-0" />}
                <span>{editingIdea ? 'Save Changes' : 'Create Idea'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {effectiveStatus === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={handleInvalidate}
                    className="h-10 px-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <Ban size={15} />
                    <span>Invalidate Idea</span>
                  </button>

                  {onConvertToTrade && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onConvertToTrade({
                          ...editingIdea,
                          symbol,
                          direction,
                          notes: notes.trim() || null,
                          screenshots,
                        });
                      }}
                      className="h-10 px-5 rounded-full bg-emerald-500 border border-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                    >
                      <Zap size={15} />
                      <span>Execute Trade</span>
                    </button>
                  )}
                </>
              )}

              {(effectiveStatus === 'invalidated' || effectiveStatus === 'expired') && (
                <button
                  type="button"
                  onClick={handleExtendLife}
                  className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw size={15} />
                  <span>Reactivate (+24h)</span>
                </button>
              )}

              {effectiveStatus === 'executed' && (
                <div className="h-10 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>Executed</span>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          )
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isEditing && editingIdea ? (
            <motion.div
              key="idea-view-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Direction / Status / Lifespan Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-card md:bg-canvas border border-border-card rounded-[18px]">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Direction</span>
                  <div className="mt-1 font-bold text-sm">
                    {direction === 'LONG' ? (
                      <span className="text-emerald-500 flex items-center gap-1"><TrendingUp size={14} /> Long Bias</span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1"><TrendingDown size={14} /> Short Bias</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-card md:bg-canvas border border-border-card rounded-[18px]">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Status</span>
                  <div className="mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs uppercase font-bold",
                      effectiveStatus === 'executed' ? "bg-emerald-500/10 text-emerald-500" :
                      effectiveStatus === 'invalidated' ? "bg-rose-500/10 text-rose-500" :
                      effectiveStatus === 'expired' ? "bg-canvas text-text-muted border border-border-card" :
                      "bg-amber-500/10 text-amber-500"
                    )}>
                      {effectiveStatus === 'executed' ? 'Executed' :
                       effectiveStatus === 'invalidated' ? 'Invalidated' :
                       effectiveStatus === 'expired' ? 'Expired' : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-card md:bg-canvas border border-border-card rounded-[18px] flex items-center justify-between col-span-2 sm:col-span-1">
                  <div>
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1">
                      <Clock size={11} /> Lifespan
                    </span>
                    <div className="mt-1 font-mono font-bold text-xs text-text-main tabular-nums">
                      {effectiveStatus === 'active' ? (getRemainingTimeText() || 'Active') :
                       effectiveStatus === 'executed' ? 'Executed' :
                       effectiveStatus === 'invalidated' ? 'Invalidated' : 'Expired'}
                    </div>
                  </div>
                  {effectiveStatus === 'active' ? (
                    <button
                      type="button"
                      onClick={handleExtendLife}
                      className="h-7 px-3 rounded-full bg-card border border-border-card text-[0.6875rem] font-semibold text-text-main flex items-center gap-1 hover:bg-canvas transition-colors cursor-pointer active:scale-95 shadow-xs"
                    >
                      <RotateCcw size={10} /> +24h
                    </button>
                  ) : (effectiveStatus === 'invalidated' || effectiveStatus === 'expired') ? (
                    <button
                      type="button"
                      onClick={handleExtendLife}
                      className="h-7 px-3 rounded-full bg-card border border-border-card text-[0.6875rem] font-semibold text-blue-500 flex items-center gap-1 hover:bg-canvas transition-colors cursor-pointer active:scale-95 shadow-xs"
                    >
                      <RotateCcw size={10} /> Reactivate
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Rationale & Key Triggers */}
              {notes && (
                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] space-y-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
                    Trade Rationale & Key Triggers
                  </span>
                  <p className="text-xs text-text-main whitespace-pre-wrap leading-relaxed">
                    {notes}
                  </p>
                </div>
              )}

              {/* Chart Snapshots */}
              <ScreenshotsSection
                screenshots={screenshots}
                isEditing={false}
                onViewScreenshot={(idx) => setViewerIndex(idx)}
              />

              {/* Mobile Quick Action Buttons in View Mode */}
              <div className="space-y-2 pt-2 md:hidden">
                {effectiveStatus === 'active' && onConvertToTrade && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onConvertToTrade({
                        ...editingIdea,
                        symbol,
                        direction,
                        notes: notes.trim() || null,
                        screenshots,
                      });
                    }}
                    className="w-full h-11 rounded-full bg-emerald-500 border border-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <Zap size={16} />
                    <span>Execute Trade</span>
                  </button>
                )}

                {(effectiveStatus === 'invalidated' || effectiveStatus === 'expired') && (
                  <button
                    type="button"
                    onClick={handleExtendLife}
                    className="w-full h-11 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <RotateCcw size={16} />
                    <span>Reactivate (+24h)</span>
                  </button>
                )}

                {/* Single destructive action per design.md §5 */}
                {editingIdea && onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                    <span>Delete Idea</span>
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idea-form-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Form Two-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Row 1: Asset / Instrument (Left) + Direction Bias (Right) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Asset / Instrument <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <TickerSelect value={symbol} onChange={(sym) => setSymbol(sym)} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Direction Bias
                    </label>
                  </div>
                  <DirectionToggle
                    value={direction}
                    onChange={(val) => setDirection(val as 'LONG' | 'SHORT')}
                    namespace="idea-modal"
                    variant="idea"
                  />
                </div>

                {/* 2 Columns: Trade Rationale & Key Triggers */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Trade Rationale & Key Triggers
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Session bias, target liquidity pool, reaction level..."
                    className="w-full bg-card md:bg-canvas border border-border-card rounded-[18px] p-4 text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {/* 2 Columns: Chart Snapshots */}
                <div className="md:col-span-2">
                  <ScreenshotsSection
                    screenshots={screenshots}
                    isEditing={true}
                    isUploading={isUploading}
                    uploadError={uploadError}
                    isDragging={isDragging}
                    fileInputRef={fileInputRef}
                    onFileInputChange={handleFileInputChange}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onRemoveScreenshot={handleRemoveScreenshot}
                    onViewScreenshot={(idx) => setViewerIndex(idx)}
                    title="Chart Snapshots"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-500">{error}</p>}

              {/* Mobile-only Destructive Action in Edit Mode */}
              {editingIdea && onDelete && (
                <div className="pt-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                    <span>Delete Idea</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </TradeModalShell>

      {/* Reusable Image Viewer */}
      <ImageViewerModal
        isOpen={viewerIndex !== null}
        images={screenshots}
        initialIndex={viewerIndex || 0}
        title={symbol ? `${symbol} - Idea Chart` : 'Idea Chart'}
        onClose={() => setViewerIndex(null)}
      />

      {/* Confirmation Dialog for Deletion per design.md §5 */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        title="Delete Idea"
        description="Are you sure you want to delete this watchlist idea? All data and charts linked to this idea will be permanently removed."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}