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
      onDelete={handleConfirm}
      deleteText={isDeleting ? 'Deleting...' : 'Delete Section'}
      cancelText="Cancel"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
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
    </BaseModal>
  );
}

