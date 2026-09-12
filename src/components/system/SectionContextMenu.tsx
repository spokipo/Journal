import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SystemSection } from './types';

export interface SectionContextMenuProps {
  section: SystemSection;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  triggerClassName?: string;
  iconSize?: number;
  isCompact?: boolean;
}

export function SectionContextMenu({
  section,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  triggerClassName,
  iconSize = 16,
  isCompact = false,
}: SectionContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ right: 16 });

  // Update floating popover coordinates based on button rect
  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    // Right margin with minimum padding from viewport edge
    const right = Math.max(12, screenWidth - rect.right);
    const estimatedMenuHeight = onMoveUp || onMoveDown ? 210 : 120;

    // Flip upwards if button is near viewport bottom
    if (
      screenHeight - rect.bottom < estimatedMenuHeight &&
      rect.top > estimatedMenuHeight
    ) {
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

  // Close on outside events, scroll, resize, or Escape key
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
      {/* Trigger button - strictly rounded-full with border & canvas per design.md §4 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Options for ${section.title}`}
        aria-expanded={isOpen}
        className={cn(
          triggerClassName ||
            'w-11 h-11 min-w-11 min-h-11 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
        )}
      >
        <MoreHorizontal size={iconSize} />
      </button>

      {/* Anchored Popover rendered in Portal to avoid any container overflow/transform clipping */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Transparent backdrop for outside clicks/taps per design.md §5 */}
                <div
                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  aria-hidden="true"
                />

                {/* Anchored Context Menu Popover per design.md §5 & §3 */}
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.95,
                    y: menuCoords.bottom ? 4 : -4,
                  }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    y: menuCoords.bottom ? 4 : -4,
                  }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'fixed',
                    top: menuCoords.top,
                    bottom: menuCoords.bottom,
                    right: menuCoords.right,
                  }}
                  className="w-[220px] bg-card border border-border-card rounded-[18px] p-1.5 shadow-2xl z-50 flex flex-col space-y-0.5 select-none"
                >
                  {/* Move Up */}
                  {onMoveUp && (
                    <button
                      type="button"
                      disabled={canMoveUp === false}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        onMoveUp();
                      }}
                      className={cn(
                        'w-full px-3 rounded-[14px] flex items-center gap-2.5 text-xs font-medium text-text-main hover:bg-canvas disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-left',
                        isCompact ? 'h-8' : 'min-h-11 h-11'
                      )}
                    >
                      <ChevronUp size={16} className="text-text-muted shrink-0" />
                      <span>Move Up</span>
                    </button>
                  )}

                  {/* Move Down */}
                  {onMoveDown && (
                    <button
                      type="button"
                      disabled={canMoveDown === false}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        onMoveDown();
                      }}
                      className={cn(
                        'w-full px-3 rounded-[14px] flex items-center gap-2.5 text-xs font-medium text-text-main hover:bg-canvas disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-left',
                        isCompact ? 'h-8' : 'min-h-11 h-11'
                      )}
                    >
                      <ChevronDown size={16} className="text-text-muted shrink-0" />
                      <span>Move Down</span>
                    </button>
                  )}

                  {/* Rename & Change Icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onEdit();
                    }}
                    className={cn(
                      'w-full px-3 rounded-[14px] flex items-center gap-2.5 text-xs font-medium text-text-main hover:bg-canvas transition-colors cursor-pointer text-left',
                      isCompact ? 'h-8' : 'min-h-11 h-11'
                    )}
                  >
                    <Edit2 size={16} className="text-text-muted shrink-0" />
                    <span>Rename & Icon</span>
                  </button>

                  {/* Divider line before destructive action per design.md §5 */}
                  <div className="h-[1px] bg-border-card my-1" />

                  {/* Delete Section */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onDelete();
                    }}
                    className={cn(
                      'w-full px-3 rounded-[14px] flex items-center gap-2.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer text-left',
                      isCompact ? 'h-8' : 'min-h-11 h-11'
                    )}
                  >
                    <Trash2 size={16} className="shrink-0" />
                    <span>Delete Section</span>
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

