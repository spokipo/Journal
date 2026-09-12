import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { type SystemSection, getSectionIcon } from './types';
import { RichTextEditor } from './RichTextEditor';

interface DesktopSystemContentProps {
  activeSection: SystemSection | null;
  isEditMode: boolean;
  isSaving: boolean;
  draftTitle: string;
  setDraftTitle: (val: string) => void;
  draftContent: string;
  setDraftContent: (val: string) => void;
  userId?: string;
  onCancelEdit: () => void;
  onSave: () => void;
  prefersReducedMotion: boolean;
}

export function DesktopSystemContent({
  activeSection,
  isEditMode,
  isSaving,
  draftTitle,
  setDraftTitle,
  draftContent,
  setDraftContent,
  userId,
  onCancelEdit,
  onSave,
  prefersReducedMotion,
}: DesktopSystemContentProps) {
  const ActiveIcon = activeSection ? getSectionIcon(activeSection.icon) : BookOpen;

  const transitionConfig = {
    duration: prefersReducedMotion ? 0 : 0.2,
    ease: [0.16, 1, 0.3, 1],
  };

  return (
    <div className="flex-1 min-w-0 bg-card border border-border-card rounded-[26px] p-7 md:p-8 flex flex-col shadow-xs overflow-hidden min-h-[560px]">
      <AnimatePresence mode="wait" initial={false}>
        {activeSection ? (
          <motion.div
            key={activeSection.id}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={transitionConfig}
            className="w-full space-y-6 flex-1 flex flex-col"
          >
            {/* Card Header inside L2 card */}
            <div className="flex items-center justify-between pb-4 border-b border-border-card gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <ActiveIcon size={20} />
                </div>
                {isEditMode ? (
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Section Title"
                    className="text-xl font-bold text-text-main bg-canvas border border-border-card rounded-[14px] px-4 py-1.5 outline-none focus:border-blue-500 w-full"
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-text-main tracking-tight truncate">
                      {activeSection.title}
                    </h2>
                    <span className="text-[0.6875rem] text-text-muted">
                      Last updated:{' '}
                      {new Date(
                        activeSection.updated_at || activeSection.created_at
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {isEditMode && (
                <span className="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider shrink-0">
                  Edit Mode
                </span>
              )}
            </div>

            {/* Rich Text Editor Body */}
            <div className="flex-1 flex flex-col">
              <RichTextEditor
                content={isEditMode ? draftContent : activeSection.content}
                isEditable={isEditMode}
                onChange={setDraftContent}
                userId={userId}
              />
            </div>

            {/* Edit Mode Bottom Actions */}
            {isEditMode && (
              <div className="pt-6 border-t border-border-card flex items-center justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  className="h-10 px-5 rounded-full bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-10 px-6 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty-system-selection"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            className="py-16 text-center text-text-muted text-xs my-auto"
          >
            Select a section from the left navigation to view or edit its contents.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
