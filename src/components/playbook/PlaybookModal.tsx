import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  BookMarked, 
  Loader2, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  ZoomIn 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fullscreen Preview Lightbox state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent body scroll when open on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset or initialize state when modal opens or editingSetup changes
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
    }
  }, [isOpen, editingSetup]);

  const handleDelete = async () => {
    if (!editingSetup?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(editingSetup.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Global onPaste listener for clipboard screenshots (Ctrl+V / Cmd+V)
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

  // Upload image to Supabase Storage with client-side WebP optimization
  const processAndUploadFile = async (file: File | Blob) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Client-side compression to WebP (maxWidth: 1920px, quality: 0.82)
      const compressedBlob = await optimizeImage(file, 1920, 0.82);

      // 2. Generate unique path: ${user.id}/${Date.now()}-${random}.webp
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
          console.warn('Supabase storage upload issue:', uploadErr);
          // Fallback to data URL for seamless local testing
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
      console.error('Screenshot optimization/upload failed:', err);
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

  // Handle files from file input
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

  // Drag & drop handlers
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

  const handleRemoveScreenshot = (indexToRemove: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        winrate: editingSetup?.winrate ?? 0,
        total_trades: editingSetup?.total_trades ?? 0,
        is_active: editingSetup?.is_active ?? true,
        screenshots,
      });
      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="playbook-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
          >
            {/* Backdrop (Solid surface per DESIGN_SYSTEM.md) */}
            <div
              onClick={onClose}
              className="absolute inset-0 bg-black/60 hidden md:block"
            />

            {/* Dialog Container: Full screen 100dvh on mobile */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-xl h-[100dvh] md:h-auto md:max-h-[90vh] bg-card rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
              style={{ 
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 md:py-4 border-b-0 md:border-b border-border-card shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 items-center justify-center font-bold text-sm">
                    <BookMarked size={18} />
                  </div>
                  <h2 className="text-xl md:text-base md:text-lg font-bold md:font-semibold text-text-main tracking-tight md:tracking-normal">
                    {editingSetup ? 'Edit Setup' : 'New Trading Setup'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-90 md:active:scale-95 transition-all shadow-sm md:shadow-none cursor-pointer"
                >
                  <X size={20} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              {/* Form Body with custom scrollbar */}
              <form onSubmit={handleSubmit} className="px-6 pt-2 pb-6 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Setup Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. London Breakout, Bull Flag, Order Block"
                    className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* Description / Rules */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Strategy Rules & Entry Criteria
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe market conditions, indicators, trigger candles, risk management rules..."
                    className="w-full bg-canvas border border-border-card rounded-[18px] p-4 text-sm text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none custom-scrollbar"
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-canvas border border-border-card rounded-[18px]">
                  <div>
                    <h4 className="text-sm font-semibold text-text-main">Active Strategy</h4>
                    <p className="text-xs text-text-muted mt-0.5">Show in trade logging dropdowns</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                      isActive ? "bg-emerald-500" : "bg-border-card"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        isActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Screenshots / Chart Examples Section */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      <span>Screenshots / Chart Examples</span>
                      {screenshots.length > 0 && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold ml-1">
                          {screenshots.length}
                        </span>
                      )}
                    </label>
                    <span className="text-[11px] text-text-muted hidden sm:inline">
                      Paste from clipboard: <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-border-card font-mono text-[10px]">Ctrl+V</kbd>
                    </span>
                  </div>

                  {/* Dropzone Container */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-[20px] p-4 md:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5",
                      isDragging 
                        ? "border-blue-500 bg-blue-500/5" 
                        : "border-border-card hover:border-blue-500/60 hover:bg-canvas/50 bg-canvas/30"
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
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-xs font-semibold">
                          Optimizing & uploading screenshot...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-0.5">
                          <UploadCloud size={20} />
                        </div>
                        <div className="text-xs font-medium text-text-main">
                          <span className="text-blue-500 font-semibold hover:underline">
                            Click to browse
                          </span>{' '}
                          or drag & drop charts
                        </div>
                        <p className="text-[11px] text-text-muted">
                          Auto-compressed to WebP (150-300 KB). Paste directly from TradingView.
                        </p>
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                  )}

                  {/* Uploaded Thumbnails Grid */}
                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3 pt-2">
                      {screenshots.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video rounded-[16px] overflow-hidden border border-border-card bg-canvas group shadow-sm"
                        >
                          <img
                            src={url}
                            alt={`Setup screenshot ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onClick={() => setPreviewImageUrl(url)}
                          />

                          {/* Hover action overlay */}
                          <div 
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer pointer-events-none"
                          >
                            <span className="text-white text-xs font-medium flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg">
                              <ZoomIn size={13} />
                              <span>View</span>
                            </span>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScreenshot(idx);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow cursor-pointer z-10"
                            title="Remove image"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-border-card flex items-center justify-between gap-2.5">
                  <div className="shrink-0">
                    {editingSetup && onDelete && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="h-11 px-3.5 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-[16px] transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete Setup"
                      >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2.5 ml-auto flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-initial h-11 px-5 flex items-center justify-center bg-card border border-border-card text-text-muted hover:text-text-main hover:bg-canvas rounded-[18px] font-medium text-sm active:scale-[0.98] transition-colors cursor-pointer"
                    >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isUploading || !title.trim()}
                    className="flex-1 sm:flex-initial h-11 px-6 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    <span>{editingSetup ? 'Save Changes' : 'Create Setup'}</span>
                  </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox Preview */}
      <ImageViewerModal
        isOpen={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        title={title ? `${title} - Screenshot` : 'Chart Screenshot'}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
}