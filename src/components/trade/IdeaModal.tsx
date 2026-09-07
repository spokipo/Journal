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
  TrendingDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';
import { lockBodyScroll } from '../../lib/scrollLock';
import { TickerSelect } from '../ui/TickerSelect';
import { ImageViewerModal } from '../ui/ImageViewerModal';

export interface IdeaPayload {
  id?: string;
  user_id?: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  session?: string;
  notes?: string | null;
  screenshots?: string[];
  status?: string;
  created_at?: string;
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
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [notes, setNotes] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // true = следующая смена direction-пилюли не должна анимироваться
  // (программная синхронизация при открытии/смене editingIdea, не клик пользователя)
  const skipPillTransition = useRef(true);

  // Блокировка скролла страницы при открытом окне (десктоп + мобайл).
  // Раньше лочилось только на мобиле — из-за этого при переходе
  // Idea -> Trade на десктопе scroll-lock ставился/снимался асинхронно
  // между двумя модалками, и страница дёргалась. Теперь оба модала
  // используют один и тот же ref-counted лок (lib/scrollLock).
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Заполнение полей при открытии / смене редактируемой идеи
  useEffect(() => {
    if (isOpen) {
      skipPillTransition.current = true;
      if (editingIdea) {
        setSymbol(editingIdea.symbol || '');
        
        // Нормализация направления: гарантирует подсветку кнопки даже при 'long'/'short'
        const rawDir = String(editingIdea.direction || '').toUpperCase();
        setDirection(rawDir === 'SHORT' ? 'SHORT' : 'LONG');

        setNotes(editingIdea.notes || '');
        setScreenshots(Array.isArray(editingIdea.screenshots) ? editingIdea.screenshots : []);
      } else {
        setSymbol('');
        setDirection('LONG');
        setNotes('');
        setScreenshots([]);
      }
      setError(null);
      setUploadError(null);
    }
  }, [isOpen, editingIdea]);

  // Вставка скриншота через Ctrl+V / Cmd+V
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, user]);

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
      // Сохраняем исходный регистр, если в базе он был строчным
      const isOriginalDirLower = editingIdea?.direction
        ? editingIdea.direction === editingIdea.direction.toLowerCase()
        : false;

      let targetDirection = isOriginalDirLower ? direction.toLowerCase() : direction.toUpperCase();

      const rawSession = editingIdea?.session || getCurrentUtcSession();
      const targetSession = isOriginalDirLower ? rawSession.toLowerCase() : rawSession.toUpperCase();

      // Нормализуем статус под схему таблицы ideas ('active' | 'triggered' | 'cancelled')
      const rawStatus = editingIdea?.status?.toLowerCase();
      const status = (rawStatus === 'triggered' || rawStatus === 'cancelled') ? rawStatus : 'active';

      const payload: Record<string, any> = {
        symbol,
        direction: targetDirection,
        session: targetSession,
        notes: notes.trim() || null,
        screenshots,
        status,
      };

      if (editingIdea?.id) {
        if (isSupabaseConfigured) {
          let updateQuery = supabase
            .from('ideas')
            .update(payload)
            .eq('id', editingIdea.id);

          if (user?.id) {
            updateQuery = updateQuery.eq('user_id', user.id);
          }

          let { data, error: updateErr } = await updateQuery.select();

          // Автоматический fallback при несоответствии регистра direction
          if (updateErr && updateErr.message?.toLowerCase().includes('direction')) {
            targetDirection = targetDirection === 'LONG' ? 'long' : 'LONG';
            payload.direction = targetDirection;

            const retry = await supabase
              .from('ideas')
              .update(payload)
              .eq('id', editingIdea.id)
              .select();

            data = retry.data;
            updateErr = retry.error;
          }

          if (updateErr) throw updateErr;

          const savedItem = data && data.length > 0 ? data[0] : { ...editingIdea, ...payload };
          onSuccess?.(savedItem);
        } else {
          onSuccess?.({ ...editingIdea, ...payload });
        }
      } else {
        // Создание новой идеи
        if (isSupabaseConfigured && user?.id) {
          const insertPayload = { ...payload, user_id: user.id };
          let { data, error: insertErr } = await supabase
            .from('ideas')
            .insert([insertPayload])
            .select();

          // Fallback при несоответствии регистра direction на INSERT
          if (insertErr && insertErr.message?.toLowerCase().includes('direction')) {
            insertPayload.direction = targetDirection === 'LONG' ? 'long' : 'LONG';
            const retry = await supabase
              .from('ideas')
              .insert([insertPayload])
              .select();

            data = retry.data;
            insertErr = retry.error;
          }

          if (insertErr) throw insertErr;

          const savedItem = data && data.length > 0 ? data[0] : insertPayload;
          onSuccess?.(savedItem);
        } else {
          onSuccess?.(payload);
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err?.message || 'Failed to save trade idea');
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
            <div
              onClick={onClose}
              className="absolute inset-0 bg-black/60 hidden md:block"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-lg bg-card rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
              {/* Шапка модалки */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 md:py-4 border-b-0 md:border-b border-border-card shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-500 items-center justify-center font-bold text-sm">
                    <Lightbulb size={18} />
                  </div>
                  <h2 className="text-xl md:text-base font-bold md:font-semibold text-text-main tracking-tight md:tracking-normal">
                    {editingIdea ? 'Edit Trade Idea' : 'New Trade Idea'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-90 md:active:scale-100 transition-all shadow-sm md:shadow-none cursor-pointer"
                >
                  <X size={20} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              {/* Тело формы */}
              <form onSubmit={handleSubmit} className="px-6 pt-2 pb-6 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* 1. Тикер */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Asset / Instrument <span className="text-red-500">*</span>
                  </label>
                  <TickerSelect value={symbol} onChange={(sym) => setSymbol(sym)} />
                </div>

                {/* 2. Направление (Long / Short) */}
                <div className="relative grid grid-cols-2 gap-1 p-1 bg-canvas border border-border-card rounded-[18px]">
                  <button
                    type="button"
                    onClick={() => {
                      skipPillTransition.current = false;
                      setDirection('LONG');
                    }}
                    className={cn(
                      "relative z-10 h-10 rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
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
                    <span>Long / Buy Bias</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      skipPillTransition.current = false;
                      setDirection('SHORT');
                    }}
                    className={cn(
                      "relative z-10 h-10 rounded-[14px] flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer select-none",
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
                    <span>Short / Sell Bias</span>
                  </button>
                </div>

                {/* 3. Заметки */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Trade Rationale & Key Triggers
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Session bias, target liquidity pool, expected market reaction..."
                    className="w-full bg-canvas border border-border-card rounded-[18px] p-4 text-sm text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                {/* 4. Скриншоты */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>Chart Examples</span>
                      {screenshots.length > 0 && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold ml-1">
                          {screenshots.length}
                        </span>
                      )}
                    </label>
                    <span className="text-[11px] text-text-muted">
                      Paste: <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-border-card font-mono text-[10px]">Ctrl+V</kbd>
                    </span>
                  </div>

                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5">
                      {screenshots.map((url, idx) => (
                        <motion.div
                          key={url + idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => setPreviewImageUrl(url)}
                          className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-sm cursor-pointer"
                        >
                          <img
                            src={url}
                            alt={`Chart ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[11px] font-medium flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md">
                              <ZoomIn size={12} /> View
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScreenshot(idx);
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow cursor-pointer z-10"
                            title="Remove image"
                          >
                            <Trash2 size={11} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border border-dashed rounded-[20px] p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1",
                      isDragging 
                        ? "border-blue-500 bg-blue-500/5" 
                        : "border-border-card hover:border-blue-500/60 bg-canvas/40"
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex items-center gap-2 text-blue-500 py-1">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-xs font-semibold">Optimizing chart (WebP)...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={20} className="text-blue-500 mb-0.5" />
                        <div className="text-xs font-medium text-text-main">
                          <span className="text-blue-500 font-semibold">Choose image</span> or drag charts here
                        </div>
                      </>
                    )}
                  </div>

                  {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                {/* Кнопки действий */}
                <div className="pt-4 border-t border-border-card flex items-center justify-between gap-2.5 shrink-0">
                  <div className="shrink-0 flex items-center gap-2">
                    {editingIdea && onDelete && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="h-11 px-3.5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-[16px] transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete Idea"
                      >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                    {editingIdea && onConvertToTrade && (
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
                        className="h-11 px-3.5 flex items-center gap-1.5 rounded-[16px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Zap size={14} />
                        <span className="hidden sm:inline">Log Trade</span>
                        <span className="sm:hidden">Log</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto flex-1 sm:flex-initial justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-initial h-11 px-5 flex items-center justify-center bg-card border border-border-card text-text-muted hover:text-text-main rounded-[16px] text-sm font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isUploading || !symbol}
                      className="flex-1 sm:flex-initial h-11 px-6 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[16px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving && <Loader2 size={16} className="animate-spin" />}
                      <span>{editingIdea ? 'Save Changes' : 'Create Idea'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageViewerModal
        isOpen={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        title={symbol ? `${symbol} - Idea Chart` : 'Idea Chart'}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
}