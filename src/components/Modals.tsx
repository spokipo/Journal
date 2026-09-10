import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
  saveText?: string;
  cancelText?: string;
  isSaving?: boolean;
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
  saveText = 'Save',
  cancelText = 'Cancel',
  isSaving = false,
}: ModalProps) {
  // Lock body scroll on mobile
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 hidden md:block"
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full h-[100dvh] flex flex-col bg-card border-border-card text-text-main",
              "md:h-auto md:max-h-[85vh] md:rounded-[26px] md:border overflow-hidden shadow-2xl rounded-none border-0",
              SIZE_CLASSES[size]
            )}
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 border-b border-border-card shrink-0">
              <h2 className="text-base font-semibold text-text-main truncate">
                {title}
              </h2>
              <button 
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 md:px-8 md:py-6 custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {!hideFooter && (
              <div className="px-6 py-4 md:px-8 md:py-5 border-t border-border-card flex items-center justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={onClose}
                  className="h-11 md:h-10 px-5 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer"
                >
                  {cancelText}
                </button>
                <button 
                  type="button"
                  disabled={isSaving}
                  onClick={onSave || onClose}
                  className="h-11 md:h-10 px-5 rounded-[18px] bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {saveText}
                </button>
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
    <BaseModal isOpen={isOpen} onClose={onClose} title="Account" hideFooter size="md">
      <AuthScreen isModal onSuccess={onClose} />
    </BaseModal>
  );
}


