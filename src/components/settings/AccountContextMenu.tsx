import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';

interface AccountContextMenuProps {
  accountName: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function AccountContextMenu({
  accountName,
  onEdit,
  onDelete,
}: AccountContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ right: 16 });

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    const right = Math.max(12, screenWidth - rect.right);
    const estimatedHeight = 90;

    if (screenHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight) {
      setMenuCoords({
        bottom: screenHeight - rect.top + 6,
        right,
      });
    } else {
      setMenuCoords({
        top: rect.bottom + 6,
        right,
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on scroll, resize, or Escape per design.md §5
  useEffect(() => {
    if (!isOpen) return;

    const handleClose = () => setIsOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Options for ${accountName}`}
        aria-expanded={isOpen}
        onClick={handleToggle}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <MoreHorizontal size={14} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Transparent dismiss layer - no backdrop-blur, no darkening per design.md §5 */}
                <div
                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  aria-hidden="true"
                />

                {/* Floating Popover panel per design.md §5 */}
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    top: menuCoords.top,
                    bottom: menuCoords.bottom,
                    right: menuCoords.right,
                  }}
                  className="fixed z-50 min-w-[160px] bg-card border border-border-card rounded-[18px] p-1.5 shadow-2xl select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-main hover:bg-canvas rounded-[14px] transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:bg-canvas"
                  >
                    <Edit size={14} className="text-text-muted" />
                    <span>Edit Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-[14px] transition-colors cursor-pointer text-left border-t border-border-card/40 mt-1 pt-2 focus-visible:outline-none focus-visible:bg-rose-500/10"
                  >
                    <Trash2 size={14} className="text-rose-500" />
                    <span>Delete Account</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
