import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check,
  BookMarked, 
  Loader2, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  ZoomIn,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';
import { lockBodyScroll } from '../../lib/scrollLock';
import { Switch } from '../ui/Switch';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import type { PlaybookSetup } from './PlaybookView';

export interface PlaybookModalProps {
  isOpen: boolean;
  editingSetup: PlaybookSetup | null;
  user: any;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onSave: (payload: {
    title: string;
    description: string | null;
    winrate: number;
    total_trades: number;
    is_active: boolean;
    screenshots: string[];
  }) => Promise<void>;
}

// Motion tokens (§2 & §5)
const modalTransition = { 
  duration: 0.18, 
  ease: [0.16, 1, 0.3, 1],
  layout: { type: 'spring', stiffness: 450, damping: 35 }
};
const backdropTransition = { duration: 0.15 };

export function PlaybookModal({
  isOpen,
  editingSetup,
  user,
  onClose,
  onDelete,
  onSave,
}: PlaybookModalProps) {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Loading & upload states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Lightbox Preview state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // SSR-safe portal mount flag
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll locking per design.md (§5 Overlay layer)
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Keyboard accessibility: Escape closes confirm or modal (§5, §9)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImageUrl) {
          setPreviewImageUrl(null);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDeleteConfirm, previewImageUrl, onClose]);

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      if (editingSetup) {
        setTitle(editingSetup.title);
        setDescription(editingSetup.description || '');
        setScreenshots(editingSetup.screenshots || []);
        setIsActive(editingSetup.is_active ?? true);
      } else {
        setTitle('');
        setDescription('');
        setScreenshots([]);
        setIsActive(true);
      }
      setUploadError(null);
      setShowDeleteConfirm(false);

      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editingSetup]);

  const handleConfirmDelete = async () => {
    if (!editingSetup?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(editingSetup.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Clipboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await processAndUploadFile(file);
          }
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
      const filePath = `${userId}/${Date.now()}-${randomKey}.webp`;

      let finalUrl = '';

      if (isSupabaseConfigured && user) {
        const { error: uploadErr } = await supabase.storage
          .from('playbook-screens')
          .upload(filePath, compressedBlob, {
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadErr) {
          console.warn('Supabase storage upload issue, fallback to data URL:', uploadErr);
          finalUrl = await blobToDataUrl(compressedBlob);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('playbook-screens')
            .getPublicUrl(filePath);
          finalUrl = publicUrl;
        }
      } else {
        finalUrl = await blobToDataUrl(compressedBlob);
      }

      setScreenshots((prev) => [...prev, finalUrl]);
    } catch (err: any) {
      console.error('Screenshot processing failed:', err);
      setUploadError(err?.message || 'Failed to process screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await processAndUploadFile(files[i]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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

  const handleDropzoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSaving || isUploading) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        winrate: editingSetup?.winrate ?? 0,
        total_trades: editingSetup?.total_trades ?? 0,
        is_active: isActive,
        screenshots,
      });
      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
            role="presentation"
          >
            {/* Backdrop (§5: Overlay layer fade 0.15s, bg-black/60) */}
            <motion.div 
              key="playbook-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={backdropTransition}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 hidden md:block"
              aria-hidden="true"
            />

            {/* Modal Dialog (design.md §5: Short form md:w-[480px], L2 rounded-[26px], mobile 100dvh rounded-none) */}
            <motion.div
              layout
              key="playbook-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="playbook-modal-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={modalTransition}
              className="relative w-full h-[100dvh] md:h-auto md:max-h-[85vh] md:w-[480px] bg-card text-text-main rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* --- DESKTOP HEADER (§5: px-8 py-6, border-b, осязаемая L1 icon-button w-10 h-10) --- */}
              <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border-card shrink-0 bg-card z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                    <BookMarked size={18} />
                  </div>
                  <h2 id="playbook-modal-title" className="text-base font-semibold text-text-main truncate">
                    {editingSetup ? 'Edit Setup' : 'New Trading Setup'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-10 h-10 rounded-full bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* --- MOBILE HEADER (§5: h-16 sticky top-0 px-4 bg-card/60 backdrop-blur-xl без border-b) --- */}
              <div 
                className="md:hidden flex items-center justify-between px-4 sticky top-0 z-20 bg-card/60 backdrop-blur-xl shrink-0"
                style={{ 
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  height: 'calc(4rem + env(safe-area-inset-top, 0px))'
                }}
              >
                {/* Слот 1 (Слева): L1 Cancel/Close button */}
                <button 
                  type="button" 
                  onClick={onClose}
                  aria-label={editingSetup ? 'Cancel editing' : 'Close modal'}
                  className="w-11 h-11 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X size={18} />
                </button>
                
                {/* Слот 2 (Центр): Title */}
                <h2 className="text-base font-semibold text-text-main truncate px-3 text-center flex-1">
                  {editingSetup ? 'Edit Setup' : 'New Setup'}
                </h2>
                
                {/* Слот 3 (Справа): L1 Save/Create Primary button */}
                <button 
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSaving || isUploading || !title.trim()}
                  aria-label={editingSetup ? 'Save changes' : 'Create setup'}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center bg-blue-500 border border-blue-500 text-white active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    (isSaving || isUploading || !title.trim()) && "opacity-50 pointer-events-none"
                  )}
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
              </div>

              {/* Form Body with custom scrollbar */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div 
                  className="px-6 py-5 md:px-8 md:py-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar flex flex-col"
                  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
                >
                  {/* Title Field */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="setup-title-input" 
                      className="text-sm font-medium text-text-main flex items-center justify-between"
                    >
                      <span>Setup Name <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      id="setup-title-input"
                      ref={titleInputRef}
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. London Breakout, Bull Flag, Order Block"
                      className="w-full h-11 md:h-10 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  {/* Description / Rules */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="setup-rules-input" 
                      className="text-sm font-medium text-text-main"
                    >
                      Strategy Rules & Entry Criteria
                    </label>
                    <textarea
                      id="setup-rules-input"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe market conditions, indicators, trigger candles, risk management rules..."
                      className="w-full bg-canvas border border-border-card rounded-[18px] p-4 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none custom-scrollbar"
                    />
                  </div>

                  {/* Status Toggle using standard Switch (§4: min-h-11 row wrapper) */}
                  <div 
                    onClick={() => setIsActive(!isActive)}
                    className="flex items-center justify-between p-4 bg-canvas border border-border-card rounded-[18px] cursor-pointer select-none min-h-11 hover:bg-card transition-colors shadow-xs"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-text-main">Active Strategy</h3>
                      <p className="text-xs text-text-muted mt-0.5">Show in trade logging dropdowns</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={isActive}
                        onChange={setIsActive}
                        aria-label="Active Strategy"
                      />
                    </div>
                  </div>

                  {/* Screenshots / Chart Section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-text-main flex items-center gap-2">
                        <ImageIcon size={16} className="text-text-muted" />
                        <span>Screenshots & Charts</span>
                        {screenshots.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-blue-500/10 text-blue-500 font-mono tabular-nums">
                            {screenshots.length}
                          </span>
                        )}
                      </label>
                      <span className="text-[0.6875rem] text-text-muted hidden sm:inline">
                        Paste: <kbd className="px-2 py-0.5 rounded-[14px] bg-canvas border border-border-card font-mono text-[0.6875rem]">Ctrl+V</kbd>
                      </span>
                    </div>

                    {/* Dropzone Container (Accessible button & dropzone §9) */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload screenshots dropzone"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={handleDropzoneKeyDown}
                      className={cn(
                        "border border-dashed rounded-[18px] p-4 md:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500",
                        isDragging 
                          ? "border-blue-500 bg-blue-500/5" 
                          : "border-border-card hover:border-blue-500/50 hover:bg-card bg-canvas/40"
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
                          <span className="text-xs font-semibold">
                            Optimizing & uploading screenshot...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-0.5 pointer-events-none">
                            <UploadCloud size={18} />
                          </div>
                          <div className="text-xs font-medium text-text-main pointer-events-none">
                            <span className="text-blue-500 font-semibold hover:underline">
                              Click to browse
                            </span>{' '}
                            or drag & drop charts
                          </div>
                          <p className="text-[0.6875rem] text-text-muted pointer-events-none">
                            Auto-compressed to WebP. Paste directly from TradingView.
                          </p>
                        </>
                      )}
                    </div>

                    {uploadError && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">{uploadError}</p>
                    )}

                    {/* Uploaded Thumbnails Grid (L0 rounded-[14px]) */}
                    {screenshots.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        {screenshots.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas group shadow-xs"
                          >
                            <img
                              src={url}
                              alt={`Setup screenshot ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                              onClick={() => setPreviewImageUrl(url)}
                            />

                            {/* Hover action overlay */}
                            <div 
                              onClick={() => setPreviewImageUrl(url)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer text-white text-[0.6875rem] font-medium"
                            >
                              <ZoomIn size={14} />
                              <span>View</span>
                            </div>

                            {/* Delete Button (§9 Touch target min 44x44px) */}
                            <div className="absolute top-0 right-0 p-1 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveScreenshot(idx);
                                }}
                                className="min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 -m-1.5 group/btn cursor-pointer focus-visible:outline-none"
                                title="Remove screenshot"
                                aria-label={`Remove screenshot ${idx + 1}`}
                              >
                                <div className="w-7 h-7 rounded-full bg-black/70 group-hover/btn:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-xs">
                                  <Trash2 size={13} />
                                </div>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Одиночное деструктивное действие внизу скроллируемого тела на mobile (§5: L1 h-11) */}
                  {editingSetup && onDelete && (
                    <div className="md:hidden mt-auto pt-8 pb-4">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        aria-label="Delete Setup"
                      >
                        <Trash2 size={16} />
                        <span>Delete Setup</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* --- DESKTOP ACTIONS FOOTER (§5: на mobile отсутствует, desktop px-8 py-5) --- */}
                <div className="hidden md:flex px-8 py-5 border-t border-border-card items-center justify-between gap-3 shrink-0 bg-card z-20">
                  <div>
                    {editingSetup && onDelete && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="h-10 px-5 rounded-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 text-sm font-medium flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Delete Setup"
                        aria-label="Delete Setup"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isUploading || !title.trim()}
                      className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {isSaving && <Loader2 size={16} className="animate-spin shrink-0" />}
                      <span>{editingSetup ? 'Save Changes' : 'Create Setup'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>

            {/* Confirm Delete Dialog (§5 Confirm dialog: md:w-[380px], L2 rounded-[26px], rounded-full buttons) */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  role="presentation"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={backdropTransition}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="absolute inset-0 bg-black/60"
                    aria-hidden="true"
                  />
                  <motion.div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-delete-title"
                    aria-describedby="confirm-delete-desc"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={modalTransition}
                    className="relative w-full max-w-[380px] bg-card border border-border-card rounded-[26px] p-6 shadow-2xl z-10 flex flex-col gap-4 text-text-main"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="space-y-1">
                        <h3 id="confirm-delete-title" className="text-sm font-semibold text-text-main">
                          Delete &ldquo;{title}&rdquo;?
                        </h3>
                        <p id="confirm-delete-desc" className="text-xs text-text-muted leading-relaxed">
                          This will remove this setup and unlink it from historical trades. This action cannot be undone.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="min-h-11 md:min-h-0 h-11 md:h-10 px-5 rounded-full bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="min-h-11 md:min-h-0 h-11 md:h-10 px-5 rounded-full bg-rose-500 border border-rose-500 text-white text-xs font-semibold hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <span>Delete Setup</span>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox Preview */}
      <ImageViewerModal
        isOpen={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        title={title ? `${title} - Screenshot` : 'Chart Screenshot'}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>,
    document.body
  );
}