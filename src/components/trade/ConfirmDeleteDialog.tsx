import React from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { ModalShell } from '../ui/ModalShell';

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
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      desktopIcon={<AlertTriangle size={18} />}
      desktopIconClass="bg-rose-500/10 text-rose-500"
      mobileRightAction={
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          aria-label="Confirm delete"
          className="w-11 h-11 rounded-full flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Trash2 size={18} />
          )}
        </button>
      }
      desktopFooterLeft={
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="h-10 px-4 rounded-full bg-canvas border border-border-card text-xs font-semibold text-text-main hover:bg-card active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
      }
      desktopFooterRight={
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="h-10 px-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
          <span>Delete</span>
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted leading-relaxed">
          {description}
        </p>

        {/* Mobile action buttons */}
        <div className="flex flex-col gap-2 pt-4 md:hidden">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="w-full h-11 rounded-full bg-canvas border border-border-card text-xs font-semibold text-text-main hover:bg-card active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

