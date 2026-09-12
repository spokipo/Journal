import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  isOpen,
  title,
  description = 'This action cannot be undone. Are you sure you want to proceed?',
  isDeleting = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-delete-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
        >
          <div onClick={onCancel} className="absolute inset-0" />

          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[380px] bg-card border border-border-card rounded-[26px] shadow-2xl p-6 z-10 flex flex-col items-center text-center space-y-4"
          >
            {/* L0 icon circle */}
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-text-main">
                {title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="h-11 md:h-10 px-4 rounded-full bg-canvas border border-border-card text-xs font-semibold text-text-main hover:bg-card active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="h-11 md:h-10 px-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
