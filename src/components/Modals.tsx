import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { AuthScreen } from './AuthScreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideFooter?: boolean;
}

export function BaseModal({ isOpen, onClose, title, children, hideFooter = false }: ModalProps) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 hidden md:block"
            style={{ backdropFilter: 'none' }} // Ensure no blur
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn(
              "relative w-full h-[100dvh] flex flex-col bg-card border-border-card text-text-main",
              "md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-[26px] md:border overflow-hidden shadow-2xl rounded-none border-0"
            )}
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 md:py-4 border-b-0 md:border-b border-border-card shrink-0">
              <h2 className="text-xl md:text-lg font-bold md:font-semibold text-text-main tracking-tight md:tracking-normal">
                {title}
              </h2>
              <button 
                onClick={onClose}
                className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-90 md:active:scale-95 transition-all shadow-sm md:shadow-none cursor-pointer"
              >
                <X size={20} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 md:p-6 custom-scrollbar">
              {children}
            </div>

            {/* Desktop Footer (optional) */}
            {!hideFooter && (
              <div className="hidden md:flex items-center justify-end p-4 border-t border-border-card gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-border-card text-text-muted hover:text-text-main hover:bg-canvas transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-full bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                >
                  Save
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
    <BaseModal isOpen={isOpen} onClose={onClose} title="Account" hideFooter>
      <AuthScreen isModal onSuccess={onClose} />
    </BaseModal>
  );
}


