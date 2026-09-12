import React, { useState } from 'react';
import { ConfirmDeleteDialog } from '../trade/ConfirmDeleteDialog';

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
    <ConfirmDeleteDialog
      isOpen={isOpen}
      title={`Delete "${sectionTitle}"?`}
      description="All rich-text notes, strategies, and images stored inside this section will be permanently deleted. This action cannot be undone."
      isDeleting={isDeleting}
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}
