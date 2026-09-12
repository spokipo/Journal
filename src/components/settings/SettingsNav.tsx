import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { SETTINGS_SECTIONS, type SettingsSectionId } from './types';

interface SettingsNavProps {
  activeSectionId: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
}

export function SettingsNav({
  activeSectionId,
  onSelectSection,
}: SettingsNavProps) {
  return (
    <div className="flex flex-col space-y-2 w-[240px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Sections ({SETTINGS_SECTIONS.length})
        </span>
      </div>

      <div className="space-y-1">
        {SETTINGS_SECTIONS.map((sec) => {
          const isActive = activeSectionId === sec.id;
          const SecIcon = sec.icon;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection(sec.id)}
              className={cn(
                "group relative w-full flex items-center gap-2 px-3.5 py-3 rounded-[18px] transition-colors select-none text-left cursor-pointer",
                isActive
                  ? "text-blue-500 font-medium"
                  : "hover:bg-canvas text-text-main"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="settings-nav-pill"
                  className="absolute inset-0 bg-blue-500/10 rounded-[18px]"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-[14px] flex items-center justify-center shrink-0 transition-colors",
                  isActive
                    ? "bg-blue-500/15 text-blue-500"
                    : "bg-canvas text-text-muted group-hover:text-text-main"
                )}
              >
                <SecIcon size={16} />
              </div>
              <span className="relative z-10 truncate text-xs sm:text-sm">{sec.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
