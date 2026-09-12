import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { lockBodyScroll } from '../../lib/scrollLock';

export interface MobileHeaderAction {
  icon?: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  isPrimary?: boolean;
  disabled?: boolean;
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export const MODAL_SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'md:w-[380px]',
  md: 'md:w-[480px]',
  lg: 'md:w-[760px] lg:w-[860px]',
  xl: 'md:w-[960px]',
};

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mobileTitle?: string;
  size?: ModalSize;
  className?: string;

  // Desktop Header
  desktopIcon?: React.ReactNode;
  desktopIconClass?: string;
  desktopHeaderActions?: React.ReactNode;

  // Mobile Header (3-slot icon-first pattern §5)
  mobileLeftAction?: MobileHeaderAction;
  mobileRightAction?: MobileHeaderAction | React.ReactNode;

  // Desktop Footer (strictly desktop-only per §5)
  desktopFooterLeft?: React.ReactNode;
  desktopFooterRight?: React.ReactNode;
  hideDesktopFooter?: boolean;

  // Form handling
  onSubmit?: (e: React.FormEvent) => void;

  // Body content styling
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Единый канонический Shell для всех модальных окон в приложении согласно design.md (§5).
 * - Mobile: полноэкранный лист bg-canvas, единый скролл-контейнер со sticky frosted-хедером (bg-canvas/80 backdrop-blur-xl без border-b).
 * - Desktop: центрированная L2-карточка bg-card rounded-[26px] с overlay bg-black/60.
 * - Единый менеджмент lockBodyScroll и закрытия по клавише Escape.
 */
export function ModalShell({
  isOpen,
  onClose,
  title,
  mobileTitle,
  size = 'lg',
  className,
  desktopIcon,
  desktopIconClass = 'bg-blue-500/10 text-blue-500',
  desktopHeaderActions,
  mobileLeftAction,
  mobileRightAction,
  desktopFooterLeft,
  desktopFooterRight,
  hideDesktopFooter = false,
  onSubmit,
  bodyClassName,
  children,
}: ModalShellProps) {
  // Body scroll locking (§5 Overlay layer)
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Keyboard accessibility: Escape closes modal (§5, §9)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileLeftAction?.onClick) {
          mobileLeftAction.onClick();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, mobileLeftAction]);

  const defaultLeftAction: MobileHeaderAction = {
    icon: <X size={18} />,
    onClick: onClose,
    ariaLabel: 'Close modal',
  };

  const activeLeftAction = mobileLeftAction || defaultLeftAction;

  const renderMobileHeaderContent = () => (
    <div className="h-16 px-4 flex items-center justify-between relative">
      {/* Слот 1 (Слева): L1 icon-button w-11 h-11 bg-canvas border border-border-card */}
      <button
        type="button"
        onClick={activeLeftAction.onClick}
        disabled={activeLeftAction.disabled}
        aria-label={activeLeftAction.ariaLabel}
        className="w-11 h-11 rounded-full bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs flex items-center justify-center transition-all cursor-pointer z-10 shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {activeLeftAction.icon || <X size={18} />}
      </button>

      {/* Слот 2 (Центр): Математически центрированный Title (§5, §3 D) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16">
        <h2 className="text-base font-semibold text-text-main truncate text-center pointer-events-auto">
          {mobileTitle || title}
        </h2>
      </div>

      {/* Слот 3 (Справа): L1-контрол или кастомный слот */}
      <div className="z-10 shrink-0 flex items-center justify-end">
        {mobileRightAction && (
          typeof (mobileRightAction as any)?.onClick === 'function' ? (
            <button
              type={onSubmit && (mobileRightAction as MobileHeaderAction).isPrimary ? 'submit' : 'button'}
              onClick={(mobileRightAction as MobileHeaderAction).onClick}
              disabled={(mobileRightAction as MobileHeaderAction).disabled}
              aria-label={(mobileRightAction as MobileHeaderAction).ariaLabel}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                (mobileRightAction as MobileHeaderAction).isPrimary
                  ? "bg-blue-500 border border-blue-500 text-white hover:bg-blue-600"
                  : "bg-canvas border border-border-card text-text-main hover:bg-card"
              )}
            >
              {(mobileRightAction as MobileHeaderAction).icon}
            </button>
          ) : (
            mobileRightAction as React.ReactNode
          )
        )}
      </div>
    </div>
  );

  const content = (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {/* =========================================================================
          DESKTOP HEADER: §5 Desktop Standard Layout
          - px-8 py-6 border-b border-border-card shrink-0 bg-card z-20
          - Left: L0 icon badge (если передан) + Title
          - Right: Desktop actions + L1 Close icon button (rounded-full w-10 h-10)
         ========================================================================= */}
      <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border-card shrink-0 bg-card z-20">
        <div className="flex items-center gap-3 min-w-0">
          {desktopIcon && (
            <div
              className={cn(
                "w-10 h-10 rounded-[14px] flex items-center justify-center font-bold text-sm shrink-0",
                desktopIconClass
              )}
            >
              {desktopIcon}
            </div>
          )}
          <h2 className="text-xl font-bold text-text-main truncate">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {desktopHeaderActions}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-full bg-canvas border border-border-card hover:bg-card text-text-muted hover:text-text-main flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          BODY / SCROLL AREA:
          - Мобильный хедер находится ВНУТРИ скролл-контейнера
            (sticky top-0, bg-canvas/80 backdrop-blur-xl), чтобы контент мягко
            заходил под него при скролле и размывался.
          - На десктопе мобильный хедер md:hidden, контент скроллится штатно.
         ========================================================================= */}
      <div className="overflow-y-auto flex-1 custom-scrollbar relative">
        <div className="md:hidden sticky top-0 z-20 shrink-0 bg-canvas/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          {renderMobileHeaderContent()}
        </div>

        <div
          className={cn(
            "px-6 py-5 pb-[calc(env(safe-area-inset-bottom)+24px)] md:px-8 md:py-6",
            bodyClassName
          )}
        >
          {children}
        </div>
      </div>

      {/* =========================================================================
          DESKTOP FOOTER: §5 Desktop Center-Card Footer (Hidden on Mobile)
          - px-8 py-5 border-t border-border-card bg-card
         ========================================================================= */}
      {!hideDesktopFooter && (desktopFooterLeft || desktopFooterRight) && (
        <div className="hidden md:flex items-center justify-between px-8 py-5 border-t border-border-card shrink-0 w-full bg-card gap-3">
          <div>{desktopFooterLeft}</div>
          <div className="flex items-center gap-3 justify-end flex-1">
            {desktopFooterRight}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-shell-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
        >
          {/* Desktop Backdrop */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/60 hidden md:block"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full h-[100dvh] rounded-none md:h-auto md:max-h-[85vh] bg-canvas md:bg-card md:rounded-[26px] md:border md:border-border-card md:shadow-2xl flex flex-col z-10 overflow-hidden",
              MODAL_SIZE_CLASSES[size],
              className
            )}
          >
            {onSubmit ? (
              <form
                onSubmit={onSubmit}
                className="flex-1 overflow-hidden flex flex-col h-full"
              >
                {content}
              </form>
            ) : (
              content
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
