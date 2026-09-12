import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, X, Edit3, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SystemSection } from './types';
import { SectionContextMenu } from './SectionContextMenu';
import { RichTextEditor } from './RichTextEditor';

interface MobileSystemDetailProps {
  activeSection: SystemSection;
  isEditMode: boolean;
  isSaving: boolean;
  draftTitle: string;
  setDraftTitle: (val: string) => void;
  draftContent: string;
  setDraftContent: (val: string) => void;
  userId?: string;
  onBackToList: () => void;
  onEnterEditMode: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onEditSection: (section: SystemSection) => void;
  onDeleteSection: (section: SystemSection) => void;
}

export function MobileSystemDetail({
  activeSection,
  isEditMode,
  isSaving,
  draftTitle,
  setDraftTitle,
  draftContent,
  setDraftContent,
  userId,
  onBackToList,
  onEnterEditMode,
  onCancelEdit,
  onSave,
  onEditSection,
  onDeleteSection,
}: MobileSystemDetailProps) {
  return (
    <div className="w-full space-y-4">
      {/* TOP BAR (§3 Section D: Back button 44x44px + Strictly Centered Title NO icon + Icon Actions) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-between w-full min-h-11"
      >
        {/* Left Slot: Back Button / Cancel Edit button (z-10) */}
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={isEditMode ? onCancelEdit : onBackToList}
            aria-label={isEditMode ? 'Cancel editing' : 'Back to sections list'}
            className="w-11 h-11 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isEditMode ? <X size={18} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Center Slot: Strictly Centered Section Title (NO icon, unaffected by 2 buttons on right) */}
        <div className="absolute inset-0 flex items-center justify-center px-24 pointer-events-none">
          {isEditMode ? (
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Section Title"
              className="pointer-events-auto text-base font-semibold text-text-main text-center bg-canvas border border-border-card rounded-full px-3 h-11 outline-none focus:border-blue-500 w-full max-w-[280px]"
            />
          ) : (
            <h2 className="text-base font-semibold text-text-main truncate text-center max-w-full">
              {activeSection.title}
            </h2>
          )}
        </div>

        {/* Right Slot: Header Action(s) — strictly icon-only buttons on mobile (§4) (z-10) */}
        <div className="min-w-11 min-h-11 flex items-center justify-end shrink-0 z-10">
          {isEditMode ? (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              aria-label="Save section changes"
              className={cn(
                "w-11 h-11 rounded-full bg-blue-500 border border-blue-500 text-white flex items-center justify-center active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isSaving && "opacity-50 pointer-events-none"
              )}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onEnterEditMode}
                aria-label="Edit section"
                className="w-11 h-11 rounded-full bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Edit3 size={18} className="text-blue-500" />
              </button>

              <SectionContextMenu
                section={activeSection}
                onEdit={() => onEditSection(activeSection)}
                onDelete={() => onDeleteSection(activeSection)}
                isCompact={false}
                iconSize={16}
                triggerClassName="w-11 h-11 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted hover:text-text-main hover:bg-card active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Section Content (L2 Container Card) with Band reveal (§3.1) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-card border border-border-card rounded-[26px] p-5 sm:p-6 shadow-xs flex flex-col space-y-5"
      >
        <RichTextEditor
          content={isEditMode ? draftContent : activeSection.content}
          isEditable={isEditMode}
          onChange={setDraftContent}
          userId={userId}
        />
      </motion.div>
    </div>
  );
}
