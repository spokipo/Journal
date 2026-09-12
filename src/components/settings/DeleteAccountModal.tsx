import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { BaseModal } from '../Modals';
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Account"
      size="sm"
      onDelete={onConfirm}
      deleteText={isDeleting ? 'Deleting...' : 'Delete Account'}
      cancelText="Cancel"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text-main">
            Delete &ldquo;{account?.name}&rdquo;?
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            This will remove this trading account and its linked balance. This action cannot be undone.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
