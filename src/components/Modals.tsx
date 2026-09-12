import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { lockBodyScroll } from '../lib/scrollLock';
import { AuthScreen } from './AuthScreen';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideFooter?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onSave?: () => void;
  onEdit?: () => void;
  saveText?: string;
  cancelText?: string;
  isSaving?: boolean;
  /**
   * true / onSave передан -> Edit/Create mode.
   * false -> View mode.
   */
  isForm?: boolean;
  destructiveAction?: React.ReactNode;
  onDelete?: () => void;
  deleteText?: string;
  mobileRightAction?: React.ReactNode;
}

const SIZE_CLASSES = {
  sm: 'md:w-[380px]',
  md: 'md:w-[480px]',
  lg: 'md:w-[760px] lg:w-[860px]',
  xl: 'md:w-[960px]',
};

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  hideFooter = false,
  size = 'md',
  onSave,
  onEdit,
  saveText = 'Save',
  cancelText = 'Cancel',
  isSaving = false,
  isForm,
  destructiveAction,
  onDelete,
  deleteText = 'Delete',
  mobileRightAction,
}: ModalProps) {
  const isFormMode = isForm ?? Boolean(onSave);

  // Scroll lock (§5, §9)
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Escape key handling (§5, §9)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Стандартизированная деструктивная кнопка по §4 и §5
  const defaultDestructiveButton = onDelete ? (
    <button
      type="button"
      onClick={onDelete}
      className="w-full md:w-auto h-11 md:h-10 px-5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium hover:bg-rose-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <Trash2 size={16} />
      <span>{deleteText}</span>
    </button>
  ) : null;

  const renderedDestructiveAction = destructiveAction || defaultDestructiveButton;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop: Overlay layer (§1, §2, §5: bg-black/60, fade 0.15s) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 hidden md:block"
          />

          {/* Modal Container: Mobile Fullscreen / Desktop Centered Card (L2 §2, §5) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{
              duration: 0.18,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={cn(
              'relative w-full h-[100dvh] flex flex-col bg-card border-border-card text-text-main',
              'md:h-auto md:max-h-[85vh] md:rounded-[26px] md:border overflow-hidden shadow-2xl rounded-none border-0 z-10',
              SIZE_CLASSES[size]
            )}
          >
            {/* --- DESKTOP HEADER (§5: px-8 py-6, border-b, осязаемая L1 icon-button w-10 h-10) --- */}
            <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border-card shrink-0 bg-card z-20">
              <h2 className="text-base font-semibold text-text-main truncate">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
              {/* Слот 1 (Слева): L1-контрол Cancel/Close (rounded-full w-11 h-11 bg-canvas border border-border-card) */}
              <button
                type="button"
                onClick={onClose}
                aria-label={isFormMode ? 'Cancel editing' : 'Close modal'}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={18} />
              </button>

              {/* Слот 2 (Центр): Title */}
              <h2 className="text-base font-semibold text-text-main truncate px-3 text-center flex-1">
                {title}
              </h2>

              {/* Слот 3 (Справа): L1-контрол Save/Check или Edit/Pencil/Action (§5) */}
              {isFormMode ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onSave || onClose}
                  aria-label={saveText}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center bg-blue-500 border border-blue-500 text-white active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    isSaving && 'opacity-50 pointer-events-none'
                  )}
                >
                  <Check size={18} />
                </button>
              ) : mobileRightAction ? (
                mobileRightAction
              ) : onEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Edit"
                  className="w-11 h-11 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Pencil size={18} />
                </button>
              ) : (
                <div className="w-11 h-11 shrink-0" aria-hidden="true" />
              )}
            </div>

            {/* --- CONTENT BODY (§5: mobile px-6 py-5, desktop px-8 py-6) --- */}
            <div
              className="flex-1 overflow-y-auto custom-scrollbar flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex-1 flex flex-col px-6 py-5 md:px-8 md:py-6">
                {children}

                {/* Одиночное деструктивное действие внизу скроллируемого тела на mobile (§5: L1 h-11) */}
                {renderedDestructiveAction && (
                  <div className="md:hidden mt-auto pt-8 pb-4">
                    {renderedDestructiveAction}
                  </div>
                )}
              </div>
            </div>

            {/* --- DESKTOP FOOTER (§5: на mobile отсутствует, desktop px-8 py-5) --- */}
            {!hideFooter && (
              <div
                className={cn(
                  'px-8 py-5 border-t border-border-card shrink-0 bg-card z-20',
                  'hidden md:flex items-center justify-between gap-3'
                )}
              >
                {/* Левый слот: деструктивное действие */}
                <div className="flex items-center">
                  {renderedDestructiveAction}
                </div>

                {/* Правый слот: Secondary / Primary pill-кнопки (§4) */}
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {cancelText}
                  </button>
                  {(onSave || isFormMode) && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={onSave || onClose}
                      className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {saveText}
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function AuthModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Account"
      hideFooter
      size="md"
      isForm={false}
    >
      <AuthScreen isModal onSuccess={onClose} />
    </BaseModal>
  );
}