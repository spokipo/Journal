import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Lightbulb, 
  Loader2, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  ZoomIn, 
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  RotateCcw,
  Edit3,
  Ban,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';
import { lockBodyScroll } from '../../lib/scrollLock';
import { TickerSelect } from '../ui/TickerSelect';
import { ImageViewerModal } from '../ui/ImageViewerModal';

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
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('active');
  const [now, setNow] = useState<number>(Date.now());

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipPillTransition = useRef(true);

  // Live timer interval (ticks every 1s when modal is open)
  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      skipPillTransition.current = true;
      if (editingIdea) {
        setIsEditing(false);
        setSymbol(editingIdea.symbol || '');
        const rawDir = String(editingIdea.direction || '').toUpperCase();
        setDirection(rawDir === 'SHORT' ? 'SHORT' : 'LONG');
        setNotes(editingIdea.notes || '');
        setScreenshots(Array.isArray(editingIdea.screenshots) ? editingIdea.screenshots : []);
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
        setScreenshots([]);
        setStatus('active');
        setExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
      }
      setError(null);
      setUploadError(null);
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

  const handleDelete = async () => {
    if (!editingIdea?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(editingIdea.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !isEditing) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await processAndUploadFile(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isEditing, user]);

  const processAndUploadFile = async (file: File | Blob) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const compressedBlob = await optimizeImage(file, 1920, 0.82);
      const userId = user?.id || 'anonymous';
      const randomKey = Math.random().toString(36).substring(2, 8);
      const filePath = `ideas/${userId}/${Date.now()}-${randomKey}.webp`;

      let finalUrl = '';

      if (isSupabaseConfigured && user) {
        const { error: uploadErr } = await supabase.storage
          .from('playbook-screens')
          .upload(filePath, compressedBlob, {
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadErr) {
          finalUrl = URL.createObjectURL(compressedBlob);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('playbook-screens')
            .getPublicUrl(filePath);
          finalUrl = publicUrl;
        }
      } else {
        finalUrl = URL.createObjectURL(compressedBlob);
      }

      setScreenshots((prev) => [...prev, finalUrl]);
    } catch (err: any) {
      console.error('Screenshot processing failed:', err);
      setUploadError(err?.message || 'Failed to process screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processAndUploadFile(files[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          await processAndUploadFile(files[i]);
        }
      }
    }
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

          // Fallback if direction check constraint requires opposite casing
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
      } else {
        if (isSupabaseConfigured && user?.id) {
          const insertPayload = { ...payload, user_id: user.id };
          let { data, error: insertErr } = await supabase
            .from('ideas')
            .insert([insertPayload])
            .select();

          // Fallback if direction check constraint requires opposite casing
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
      }

      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
      if (err?.message?.includes('ideas_direction_check')) {
        setError('Database error: check constraint "ideas_direction_check" failed. Please execute migration 20260910000002_fix_ideas_direction_constraint.sql in your Supabase SQL Editor.');
      } else {
        setError(err?.message || 'Failed to save trade idea');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="idea-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
          >
            <div onClick={onClose} className="absolute inset-0 bg-black/60 hidden md:block" />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-md:h-[100dvh] md:w-[760px] lg:w-[860px] md:max-h-[85vh] bg-card rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 border-b border-border-card shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex w-8 h-8 rounded-[14px] bg-amber-500/10 text-amber-500 items-center justify-center font-bold text-sm shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-text-main truncate">
                      {editingIdea ? (isEditing ? 'Edit Watchlist Idea' : `${symbol} Watchlist Idea`) : 'New Watchlist Idea'}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {editingIdea && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="h-9 px-3 rounded-[14px] bg-card border border-border-card hover:bg-canvas text-xs font-semibold text-text-main flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* READ-ONLY VIEW */}
              {!isEditing && editingIdea ? (
                <div className="px-6 py-5 md:px-8 md:py-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-canvas border border-border-card rounded-[18px]">
                        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Direction</span>
                        <div className="mt-1 font-bold text-sm">
                          {direction === 'LONG' ? (
                            <span className="text-emerald-500 flex items-center gap-1"><TrendingUp size={14} /> Long Bias</span>
                          ) : (
                            <span className="text-rose-500 flex items-center gap-1"><TrendingDown size={14} /> Short Bias</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 bg-canvas border border-border-card rounded-[18px]">
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

                      <div className="p-3.5 bg-canvas border border-border-card rounded-[18px] flex items-center justify-between col-span-2 sm:col-span-1">
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
                            className="h-7 px-2.5 rounded-[12px] bg-card border border-border-card text-[0.6875rem] font-semibold text-text-main flex items-center gap-1 hover:bg-canvas transition-colors cursor-pointer"
                          >
                            <RotateCcw size={10} /> +24h
                          </button>
                        ) : (effectiveStatus === 'invalidated' || effectiveStatus === 'expired') ? (
                          <button
                            type="button"
                            onClick={handleExtendLife}
                            className="h-7 px-2.5 rounded-[12px] bg-card border border-border-card text-[0.6875rem] font-semibold text-blue-500 flex items-center gap-1 hover:bg-canvas transition-colors cursor-pointer"
                          >
                            <RotateCcw size={10} /> Reactivate
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {notes && (
                      <div className="p-4 bg-canvas border border-border-card rounded-[18px] space-y-1">
                        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
                          Trade Rationale & Key Triggers
                        </span>
                        <p className="text-xs text-text-main whitespace-pre-wrap leading-relaxed">
                          {notes}
                        </p>
                      </div>
                    )}

                    {screenshots.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                          <ImageIcon size={14} /> Chart Snapshots ({screenshots.length})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {screenshots.map((url, idx) => (
                            <div
                              key={url + idx}
                              onClick={() => setViewerIndex(idx)}
                              className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-xs cursor-pointer"
                            >
                              <img src={url} alt={`Chart ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <span className="text-xs font-semibold flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full">
                                  <ZoomIn size={12} /> View
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 md:px-8 md:py-5 border-t border-border-card flex items-center justify-between gap-2 md:gap-3 shrink-0 w-full max-w-full overflow-hidden">
                    <div>
                      {onDelete && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleDelete}
                          title="Delete Idea"
                          aria-label="Delete Idea"
                          className="w-11 h-11 md:h-10 md:w-auto md:px-4 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-[18px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={16} />}
                          <span className="hidden md:inline ml-1.5 text-xs font-semibold">Delete</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="hidden md:flex h-10 px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer items-center justify-center shrink-0"
                      >
                        Close
                      </button>

                      {effectiveStatus === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={handleInvalidate}
                            title="Invalidate Idea"
                            aria-label="Invalidate Idea"
                            className="w-11 h-11 md:h-10 md:w-auto md:px-4 rounded-[18px] bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 active:scale-[0.98]"
                          >
                            <Ban size={15} className="shrink-0" />
                            <span className="hidden md:inline">Invalidate Idea</span>
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
                              className="h-11 md:h-10 px-4 md:px-5 flex-1 md:flex-initial rounded-[18px] bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5 truncate"
                            >
                              <Zap size={15} className="shrink-0" />
                              <span className="truncate">Execute Trade</span>
                            </button>
                          )}
                        </>
                      )}

                      {(effectiveStatus === 'invalidated' || effectiveStatus === 'expired') && (
                        <button
                          type="button"
                          onClick={handleExtendLife}
                          className="h-11 md:h-10 px-4 flex-1 md:flex-initial rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 truncate"
                        >
                          <RotateCcw size={15} className="shrink-0" />
                          <span className="truncate">Reactivate (+24h)</span>
                        </button>
                      )}

                      {effectiveStatus === 'executed' && (
                        <div className="h-11 md:h-10 px-3.5 rounded-[18px] bg-emerald-500/10 text-emerald-500 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0">
                          <CheckCircle2 size={15} className="shrink-0" />
                          <span>Executed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* EDIT/CREATE FORM */
                <form 
                  onSubmit={handleSubmit} 
                  className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between"
                >
                  <div className="px-6 py-5 md:px-8 md:py-6 space-y-5 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      {/* РЯД 1: Asset / Instrument (слева) + Direction Bias (справа) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                            Asset / Instrument <span className="text-rose-500">*</span>
                          </label>
                        </div>
                        <TickerSelect value={symbol} onChange={(sym) => setSymbol(sym)} />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                            Direction Bias
                          </label>
                        </div>
                        <div className="relative grid grid-cols-2 gap-1 p-1 bg-canvas border border-border-card rounded-[18px] h-11 md:h-10 items-stretch">
                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setDirection('LONG'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
                              direction === 'LONG' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {direction === 'LONG' && (
                              <motion.div
                                layoutId="idea-direction-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-emerald-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            <TrendingUp size={14} />
                            <span>Long Bias</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { skipPillTransition.current = false; setDirection('SHORT'); }}
                            className={cn(
                              "relative z-10 h-full rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
                              direction === 'SHORT' ? "text-white" : "text-text-muted hover:text-text-main"
                            )}
                          >
                            {direction === 'SHORT' && (
                              <motion.div
                                layoutId="idea-direction-pill"
                                transition={skipPillTransition.current ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                                className="absolute inset-0 bg-rose-500 rounded-[14px] shadow-sm -z-10"
                              />
                            )}
                            <TrendingDown size={14} />
                            <span>Short Bias</span>
                          </button>
                        </div>
                      </div>

                      {/* РЯД 2: Trade Rationale & Key Triggers (на всю ширину) */}
                      <div className="md:col-span-2 space-y-1.5">
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
                          className="w-full bg-canvas border border-border-card rounded-[18px] p-3 text-xs text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>

                      {/* РЯД 3: Chart Examples (на всю ширину) */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <ImageIcon size={12} /> Chart Examples ({screenshots.length})
                          </label>
                          <span className="text-[0.6875rem] text-text-muted">Paste: Ctrl+V</span>
                        </div>

                        {screenshots.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {screenshots.map((url, idx) => (
                              <div
                                key={url + idx}
                                onClick={() => setViewerIndex(idx)}
                                className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-xs cursor-pointer"
                              >
                                <img src={url} alt={`Chart ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveScreenshot(idx); }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow cursor-pointer z-10"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border border-dashed rounded-[18px] p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1",
                            isDragging ? "border-blue-500 bg-blue-500/5" : "border-border-card hover:border-blue-500/60 bg-canvas/40"
                          )}
                        >
                          <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*" multiple className="hidden" />
                          {isUploading ? (
                            <div className="flex items-center gap-2 text-blue-500 py-1">
                              <Loader2 size={16} className="animate-spin" />
                              <span className="text-xs font-medium">Optimizing chart (WebP)...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <UploadCloud size={16} className="text-blue-500" />
                              <span>Drop chart image here or click to browse</span>
                            </div>
                          )}
                        </div>

                        {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}
                        {error && <p className="text-xs text-rose-500">{error}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 md:px-8 md:py-5 border-t border-border-card flex items-center justify-between gap-2 md:gap-3 shrink-0 w-full max-w-full overflow-hidden">
                    <div>
                      {editingIdea && onDelete && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleDelete}
                          title="Delete Idea"
                          aria-label="Delete Idea"
                          className="w-11 h-11 md:h-10 md:w-auto md:px-4 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-[18px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={16} />}
                          <span className="hidden md:inline ml-1.5 text-xs font-semibold">Delete</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <button
                        type="button"
                        onClick={() => editingIdea ? setIsEditing(false) : onClose()}
                        className="h-11 md:h-10 px-4 md:px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || isUploading || !symbol}
                        className="h-11 md:h-10 px-4 md:px-5 flex-1 md:flex-initial rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 truncate"
                      >
                        {isSaving && <Loader2 size={14} className="animate-spin shrink-0" />}
                        <span className="truncate">{editingIdea ? 'Save Changes' : 'Create Idea'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageViewerModal
        isOpen={viewerIndex !== null}
        images={screenshots}
        initialIndex={viewerIndex || 0}
        title={symbol ? `${symbol} - Idea Chart` : 'Idea Chart'}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}