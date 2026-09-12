import React from 'react';
import { Edit3, Check, X, Loader2 } from 'lucide-react';
import type { SystemSection } from './types';
import { SectionContextMenu } from './SectionContextMenu';

interface SystemHeaderProps {
  activeSection: SystemSection | null;
  isEditMode: boolean;
  isSaving: boolean;
  onEnterEditMode: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onEditSection: (section: SystemSection) => void;
  onDeleteSection: (section: SystemSection) => void;
}

export function SystemHeader({
  activeSection,
  isEditMode,
  isSaving,
  onEnterEditMode,
  onCancelEdit,
  onSave,
  onEditSection,
  onDeleteSection,
}: SystemHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight">
            Trading System
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            Knowledge Base
          </span>
        </div>
        <p className="text-text-muted text-xs sm:text-sm mt-0.5">
          Your personal rulebook, strategy guidelines, and operating checklists
        </p>
      </div>

      {activeSection && (
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSaving}
                className="h-10 px-5 rounded-full bg-card border border-border-card text-xs font-semibold text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEnterEditMode}
                className="h-10 px-5 rounded-full bg-card border border-border-card text-xs font-semibold text-text-main hover:bg-canvas hover:border-blue-500/40 transition-colors cursor-pointer flex items-center gap-2 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Edit3 size={14} className="text-blue-500" />
                <span>Edit</span>
              </button>

              <SectionContextMenu
                section={activeSection}
                onEdit={() => onEditSection(activeSection)}
                onDelete={() => onDeleteSection(activeSection)}
                isCompact={true}
                iconSize={15}
                triggerClassName="h-10 w-10 rounded-full bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
