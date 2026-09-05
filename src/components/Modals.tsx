import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BaseModal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'none' }} // Ensure no blur
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full h-[100dvh] flex flex-col bg-card border-border-card text-text-main",
              "md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-[26px] md:border overflow-hidden shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 md:py-4 border-b border-border-card shrink-0">
              <button 
                onClick={onClose}
                className="text-text-muted hover:text-text-main px-2 py-1 md:hidden"
              >
                Cancel
              </button>
              <h2 className="font-semibold text-lg absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
                {title}
              </h2>
              <button 
                className="text-blue-500 font-medium px-2 py-1 md:hidden"
                onClick={onClose}
              >
                Save
              </button>
              {/* Desktop close button */}
              <button 
                onClick={onClose}
                className="hidden md:flex p-2 rounded-full hover:bg-canvas text-text-muted hover:text-text-main transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </div>

            {/* Desktop Footer (optional) */}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function IdeaModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="New Idea">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-muted">Title</label>
          <input 
            type="text" 
            placeholder="What's on your mind?"
            className="w-full bg-canvas border border-border-card rounded-[18px] px-4 py-3 outline-none focus:border-blue-500 text-text-main"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-muted">Description</label>
          <textarea 
            rows={4}
            placeholder="Elaborate your thoughts..."
            className="w-full bg-canvas border border-border-card rounded-[18px] px-4 py-3 outline-none focus:border-blue-500 text-text-main resize-none"
          />
        </div>
      </div>
    </BaseModal>
  );
}

export function TradeModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Log Trade">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Symbol</label>
            <input 
              type="text" 
              placeholder="e.g. AAPL"
              className="w-full bg-canvas border border-border-card rounded-[18px] px-4 py-3 outline-none focus:border-blue-500 text-text-main"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Direction</label>
            <select className="w-full bg-canvas border border-border-card rounded-[18px] px-4 py-3 outline-none focus:border-blue-500 text-text-main appearance-none">
              <option>Long</option>
              <option>Short</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-muted">Entry Price</label>
          <input 
            type="number" 
            placeholder="0.00"
            className="w-full bg-canvas border border-border-card rounded-[18px] px-4 py-3 outline-none focus:border-blue-500 text-text-main"
          />
        </div>
      </div>
    </BaseModal>
  );
}

