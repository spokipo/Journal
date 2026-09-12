import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Modals';
import { SYSTEM_ICONS, type LucideIcon } from './types';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, icon: string) => Promise<void> | void;
  initialTitle?: string;
  initialIcon?: string;
  isEditing?: boolean;
}

export function SectionModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialIcon = 'BookOpen',
  isEditing = false,
}: SectionModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setSelectedIcon(initialIcon || 'BookOpen');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialTitle, initialIcon]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(trimmed, selectedIcon);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save section');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Rename & Change Icon' : 'New Section'}
      size="md"
      onSave={handleSubmit}
      saveText={isEditing ? 'Save Changes' : 'Create Section'}
      isSaving={isSubmitting}
      isForm={true}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section Title */}
        <div className="space-y-2">
          <label className="block text-[0.6875rem] font-semibold text-text-muted uppercase tracking-wider">
            Section Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Risk Management, Daily Routine..."
            autoFocus
            className={cn(
              "w-full h-11 md:h-10 bg-card md:bg-canvas border rounded-[18px] px-3.5 text-xs md:text-sm text-text-main placeholder:text-text-muted/60 outline-none transition-colors shadow-xs",
              error
                ? "border-rose-500 focus:border-rose-500"
                : "border-border-card hover:border-blue-500/50 focus:border-blue-500"
            )}
          />
          {error && <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>}
        </div>

        {/* Icon Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[0.6875rem] font-semibold text-text-muted uppercase tracking-wider">
              Choose Icon
            </label>
            <span className="text-[0.6875rem] text-text-muted font-mono">
              Selected: {selectedIcon}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2 p-2 bg-card md:bg-canvas border border-border-card rounded-[18px] max-h-48 overflow-y-auto custom-scrollbar">
            {Object.entries(SYSTEM_ICONS).map(([name, IconComponent]) => {
              const isSelected = selectedIcon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  title={name}
                  className={cn(
                    "h-10 rounded-[14px] flex items-center justify-center transition-all cursor-pointer select-none relative",
                    isSelected
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                      : "bg-card border border-border-card text-text-muted hover:text-text-main hover:border-blue-500/40"
                  )}
                >
                  <IconComponent size={18} />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-card flex items-center justify-center">
                      <Check size={8} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </BaseModal>
  );
}

