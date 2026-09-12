import React from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ModalShell, type ModalSize } from './ui/ModalShell';
import { AuthScreen } from './AuthScreen';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideFooter?: boolean;
  size?: ModalSize;
  onSave?: () => void;
  onEdit?: () => void;
  saveText?: string;
  cancelText?: string;
  isSaving?: boolean;
  /**
   * true / onSave передан -> Edit/Create mode.
   * false -> View mode.
   */
  isForm?: boolean;
  destructiveAction?: React.ReactNode;
  onDelete?: () => void;
  deleteText?: string;
  mobileRightAction?: React.ReactNode;
}

/**
 * BaseModal — высокоуровневая обёртка над каноническим ModalShell (§5).
 * Добавляет стандартные кнопки сохранения/отмены/удаления, адаптацию режимов Form vs View,
 * и поддержку стандартных размеров.
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  hideFooter = false,
  size = 'md',
  onSave,
  onEdit,
  saveText = 'Save',
  cancelText = 'Cancel',
  isSaving = false,
  isForm,
  destructiveAction,
  onDelete,
  deleteText = 'Delete',
  mobileRightAction,
}: ModalProps) {
  const isFormMode = isForm ?? Boolean(onSave);

  // Стандартизированная деструктивная кнопка по §4 и §5
  const defaultDestructiveButton = onDelete ? (
    <button
      type="button"
      onClick={onDelete}
      className="w-full md:w-auto h-11 md:h-10 px-5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium hover:bg-rose-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <Trash2 size={16} />
      <span>{deleteText}</span>
    </button>
  ) : null;

  const renderedDestructiveAction = destructiveAction || defaultDestructiveButton;

  // Mobile Right Action по §5 (Check для форм, Pencil для просмотра или кастомное действие)
  const resolvedMobileRightAction = isFormMode ? {
    icon: <Check size={18} />,
    onClick: onSave || onClose,
    ariaLabel: saveText,
    isPrimary: true,
    disabled: isSaving,
  } : mobileRightAction ? (
    mobileRightAction
  ) : onEdit ? {
    icon: <Pencil size={18} />,
    onClick: onEdit,
    ariaLabel: 'Edit',
    isPrimary: false,
  } : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      mobileLeftAction={{
        onClick: onClose,
        ariaLabel: isFormMode ? 'Cancel editing' : 'Close modal',
      }}
      mobileRightAction={resolvedMobileRightAction}
      hideDesktopFooter={hideFooter}
      desktopFooterLeft={renderedDestructiveAction}
      desktopFooterRight={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {cancelText}
          </button>
          {(onSave || isFormMode) && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onSave || onClose}
              className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {saveText}
            </button>
          )}
        </>
      }
    >
      <div>
        {children}

        {/* Одиночное деструктивное действие внизу скроллируемого тела на mobile (§5: L1 h-11) */}
        {renderedDestructiveAction && (
          <div className="md:hidden pt-8 pb-4">
            {renderedDestructiveAction}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export function AuthModal({ isOpen, onClose }: Omit<ModalProps, 'title' | 'children'>) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Account"
      hideFooter
      size="md"
      isForm={false}
    >
      <AuthScreen isModal onSuccess={onClose} />
    </BaseModal>
  );
}