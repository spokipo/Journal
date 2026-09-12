import React, { useState, useEffect, useRef } from 'react';
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
  Edit3,
  Pencil,
  Percent,
  Scale,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { optimizeImage } from '../../lib/imageOptimizer';
import { Switch } from '../ui/Switch';
import { ImageViewerModal } from '../ui/ImageViewerModal';
import { ModalShell } from '../ui/ModalShell';
import { ConfirmDeleteDialog } from '../trade/ConfirmDeleteDialog';
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
  // Mode: View Only vs Edit
  const [isEditing, setIsEditing] = useState(false);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Keyboard accessibility: Escape closes confirm, preview, cancel editing, or modal (§5, §9)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImageUrl) {
          setPreviewImageUrl(null);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (isEditing && editingSetup) {
          handleCancelEditing();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDeleteConfirm, previewImageUrl, isEditing, editingSetup, onClose]);

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      if (editingSetup) {
        setTitle(editingSetup.title);
        setDescription(editingSetup.description || '');
        setScreenshots(editingSetup.screenshots || []);
        setIsActive(editingSetup.is_active ?? true);
        setIsEditing(false); // Default to View mode for existing setups
      } else {
        setTitle('');
        setDescription('');
        setScreenshots([]);
        setIsActive(true);
        setIsEditing(true); // Default to Edit mode for new setups
      }
      setUploadError(null);
      setShowDeleteConfirm(false);

      if (!editingSetup) {
        const timer = setTimeout(() => {
          titleInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, editingSetup]);

  const handleCancelEditing = () => {
    if (editingSetup) {
      setTitle(editingSetup.title);
      setDescription(editingSetup.description || '');
      setScreenshots(editingSetup.screenshots || []);
      setIsActive(editingSetup.is_active ?? true);
      setIsEditing(false);
    } else {
      onClose();
    }
  };

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
    if (!isOpen || !isEditing) return;

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
  }, [isOpen, isEditing, user]);

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
      if (editingSetup) {
        setIsEditing(false); // Return to view mode after editing
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Header titles
  const modalTitle = isEditing 
    ? (editingSetup ? 'Edit Trading Setup' : 'New Trading Setup')
    : `${title || 'Setup'} Setup Details`;

  const mobileTitle = isEditing
    ? (editingSetup ? 'Edit Setup' : 'New Setup')
    : `${title || 'Setup'} Details`;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        mobileTitle={mobileTitle}
        desktopIcon={<BookMarked size={20} />}
        desktopIconClass="bg-blue-500/10 text-blue-500"
        size="lg"
        onSubmit={isEditing ? handleSubmit : undefined}
        mobileLeftAction={{
          icon: <X size={18} />,
          onClick: isEditing && editingSetup ? handleCancelEditing : onClose,
          ariaLabel: isEditing && editingSetup ? 'Cancel editing' : 'Close modal',
        }}
        mobileRightAction={
          isEditing ? (
            {
              icon: isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />,
              onClick: handleSubmit,
              ariaLabel: editingSetup ? 'Save changes' : 'Create setup',
              isPrimary: true,
              disabled: isSaving || isUploading || !title.trim(),
            }
          ) : (
            {
              icon: <Pencil size={18} />,
              onClick: () => setIsEditing(true),
              ariaLabel: 'Edit setup',
              isPrimary: false,
            }
          )
        }
        desktopHeaderActions={
          !isEditing && editingSetup && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="h-10 px-4 rounded-full bg-card border border-border-card hover:bg-canvas text-sm font-medium text-text-main flex items-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Edit3 size={16} />
              <span>Edit</span>
            </button>
          )
        }
        desktopFooterLeft={
          editingSetup && onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 px-4 rounded-full flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer active:scale-95 disabled:opacity-50 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              title="Delete Setup"
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
                className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {editingSetup ? 'Cancel' : 'Close'}
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploading || !title.trim()}
                className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {isSaving && <Loader2 size={16} className="animate-spin shrink-0" />}
                <span>{editingSetup ? 'Save Changes' : 'Create Setup'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Close
            </button>
          )
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isEditing && editingSetup ? (
            /* =========================================================================
               VIEW ONLY MODE: §5 Readonly presentation matching TradeModal / IdeaModal
               ========================================================================= */
            <motion.div
              key="playbook-view-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Metrics Grid: Win Rate, Total Trades, Active Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] shadow-xs">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <Percent size={12} className="text-blue-500" /> Win Rate
                  </span>
                  <div className="mt-1 font-mono font-bold text-lg tabular-nums">
                    <span className={cn(
                      (editingSetup.winrate ?? 0) >= 50 
                        ? "text-emerald-500" 
                        : (editingSetup.winrate ?? 0) > 0 
                        ? "text-text-main" 
                        : "text-text-muted"
                    )}>
                      {editingSetup.winrate != null ? `${editingSetup.winrate}%` : '0%'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] shadow-xs">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <Scale size={12} className="text-blue-500" /> Total Trades
                  </span>
                  <div className="mt-1 font-mono font-bold text-lg text-text-main tabular-nums">
                    {editingSetup.total_trades ?? 0}
                  </div>
                </div>

                <div className="p-4 bg-card md:bg-canvas border border-border-card rounded-[18px] shadow-xs">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted flex items-center gap-2">
                    <Check size={12} className={isActive ? "text-emerald-500" : "text-text-muted"} /> Status
                  </span>
                  <div className="mt-1">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[0.6875rem] uppercase font-bold inline-flex items-center gap-2",
                      isActive 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : "bg-canvas md:bg-card border border-border-card text-text-muted"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-text-muted")} />
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strategy Rules & Entry Criteria */}
              <div className="p-5 bg-card md:bg-canvas border border-border-card rounded-[18px] shadow-xs space-y-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted block">
                  Strategy Rules & Entry Criteria
                </span>
                {description ? (
                  <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap font-normal">
                    {description}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    No strategy rules or notes documented yet for this setup.
                  </p>
                )}
              </div>

              {/* Screenshots Gallery */}
              <div className="p-5 bg-card md:bg-canvas border border-border-card rounded-[18px] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <ImageIcon size={14} className="text-text-muted" />
                    <span>Screenshots & Charts</span>
                  </span>
                  {screenshots.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-blue-500/10 text-blue-500 font-mono tabular-nums border border-blue-500/20">
                      {screenshots.length}
                    </span>
                  )}
                </div>

                {screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {screenshots.map((url, idx) => (
                      <div
                        key={`screenshot-view-${idx}`}
                        onClick={() => setPreviewImageUrl(url)}
                        className="group relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas cursor-pointer select-none"
                      >
                        <img
                          src={url}
                          alt={`${title} chart ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-text-muted">
                    No chart screenshots attached to this setup.
                  </div>
                )}
              </div>

              {/* Mobile Single Destructive Action (§5: L1 h-11 button) */}
              {editingSetup && onDelete && (
                <div className="md:hidden pt-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    aria-label="Delete Setup"
                  >
                    <Trash2 size={16} />
                    <span>Delete Setup</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            /* =========================================================================
               EDIT / CREATE MODE: Form Fields
               ========================================================================= */
            <motion.div
              key="playbook-edit-mode"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {/* Setup Name & Active Toggle Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="space-y-2 md:col-span-2">
                  <label 
                    htmlFor="setup-title-input" 
                    className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center justify-between"
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
                    className="w-full h-11 bg-card md:bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
                  />
                </div>

                <div 
                  onClick={() => setIsActive(!isActive)}
                  className="flex items-center justify-between p-3.5 bg-card md:bg-canvas border border-border-card rounded-[18px] cursor-pointer select-none h-11 hover:border-blue-500/30 transition-colors shadow-xs md:mt-6"
                >
                  <span className="text-xs font-semibold text-text-main">Active Strategy</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={isActive}
                      onChange={setIsActive}
                      aria-label="Active Strategy"
                    />
                  </div>
                </div>
              </div>

              {/* Description / Strategy Rules */}
              <div className="space-y-2">
                <label 
                  htmlFor="setup-rules-input" 
                  className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted"
                >
                  Strategy Rules & Entry Criteria
                </label>
                <textarea
                  id="setup-rules-input"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe market conditions, indicators, trigger candles, risk management rules..."
                  className="w-full bg-card md:bg-canvas border border-border-card rounded-[18px] p-4 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none custom-scrollbar shadow-xs"
                />
              </div>

              {/* Screenshots & Charts Upload Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <ImageIcon size={14} className="text-text-muted" />
                    <span>Screenshots & Charts</span>
                    {screenshots.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-blue-500/10 text-blue-500 font-mono tabular-nums border border-blue-500/20">
                        {screenshots.length}
                      </span>
                    )}
                  </label>
                  <span className="text-[0.6875rem] text-text-muted hidden sm:inline">
                    Paste: <kbd className="px-2 py-0.5 rounded-[14px] bg-canvas border border-border-card font-mono text-[0.6875rem]">Ctrl+V</kbd>
                  </span>
                </div>

                {/* Dropzone Container */}
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
                    "border border-dashed rounded-[18px] p-4 md:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-xs",
                    isDragging 
                      ? "border-blue-500 bg-blue-500/5" 
                      : "border-border-card hover:border-blue-500/50 bg-card md:bg-canvas"
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
                        Drop chart screenshots here or <span className="text-blue-500 font-semibold">Browse</span>
                      </div>
                      <p className="text-[0.6875rem] text-text-muted pointer-events-none">
                        Supports WebP, PNG, JPG (auto-compressed to WebP)
                      </p>
                    </>
                  )}
                </div>

                {/* Error Banner */}
                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-[14px] text-xs text-rose-500 flex items-center justify-between">
                    <span>{uploadError}</span>
                    <button 
                      type="button" 
                      onClick={() => setUploadError(null)}
                      aria-label="Dismiss error"
                      className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-500 hover:bg-rose-500/30 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Screenshots Preview Grid */}
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                    {screenshots.map((url, idx) => (
                      <div
                        key={`screenshot-edit-${idx}`}
                        className="group relative aspect-video rounded-[14px] overflow-hidden border border-border-card bg-canvas"
                      >
                        <img
                          src={url}
                          alt={`Uploaded screenshot ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(url)}
                            className="w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                            title="Preview screenshot"
                            aria-label="Preview screenshot"
                          >
                            <ZoomIn size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(idx)}
                            className="w-8 h-8 rounded-full bg-rose-500 border border-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                            title="Delete screenshot"
                            aria-label="Delete screenshot"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Single Destructive Action (§5: L1 h-11) */}
              {editingSetup && onDelete && (
                <div className="md:hidden pt-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    aria-label="Delete Setup"
                  >
                    <Trash2 size={16} />
                    <span>Delete Setup</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ModalShell>

      {/* Confirmation Dialog (§5 Confirm Dialog) */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        title={`Delete "${title || 'Setup'}"?`}
        description="This will remove this trading setup. Historical trades linked to it will not be deleted, but the playbook link will be cleared."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Lightbox Fullscreen Preview Modal */}
      {previewImageUrl && (
        <ImageViewerModal
          isOpen={Boolean(previewImageUrl)}
          imageUrl={previewImageUrl}
          title={title ? `${title} - Screenshot` : 'Chart Screenshot'}
          onClose={() => setPreviewImageUrl(null)}
        />
      )}
    </>
  );
}