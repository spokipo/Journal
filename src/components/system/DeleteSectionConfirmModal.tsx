import React, { useState } from 'react';
import { BaseModal } from '../Modals';
import { AlertTriangle } from 'lucide-react';

interface DeleteSectionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  sectionTitle: string;
}

export function DeleteSectionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sectionTitle,
}: DeleteSectionConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete section error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Section"
      size="sm"
      hideFooter
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[14px] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-main">
              Are you sure you want to delete &ldquo;{sectionTitle}&rdquo;?
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              All rich-text notes, strategies, and images stored inside this section will be permanently deleted. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-11 md:h-10 px-4 rounded-[18px] bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="h-11 md:h-10 px-4 rounded-[18px] bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Section'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

