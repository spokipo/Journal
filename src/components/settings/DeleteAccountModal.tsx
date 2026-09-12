import React from 'react';
import { ConfirmDeleteDialog } from '../trade/ConfirmDeleteDialog';
import type { Account } from './types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteAccountModal({
  isOpen,
  account,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteAccountModalProps) {
  return (
    <ConfirmDeleteDialog
      isOpen={isOpen}
      title={`Delete "${account?.name || 'Account'}"?`}
      description="This will remove this trading account and its linked balance. Historical trades will not be deleted, but their account link will be cleared."
      isDeleting={isDeleting}
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
