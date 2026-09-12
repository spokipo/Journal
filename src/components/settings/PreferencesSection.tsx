import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Bell, BellOff, Globe } from 'lucide-react';
import { useTheme } from '../../lib/useTheme';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { LANGUAGE_OPTIONS } from './types';

export function PreferencesSection() {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');

  return (
    <div className="space-y-4">
      {/* Theme Row Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
            {theme === 'dark' ? (
              <Moon size={18} className="text-blue-500" />
            ) : (
              <Sun size={18} className="text-amber-500" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-text-main">
              Theme Appearance
            </div>
            <div className="text-xs text-text-muted">
              Switch between dark and light interface mode
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="h-10 px-5 flex items-center justify-center gap-2 bg-card border border-border-card text-text-main rounded-full font-semibold text-xs hover:bg-canvas active:scale-[0.98] transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} className="text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} className="text-blue-500" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Notifications Row Card with Switch */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
            {notifications ? (
              <Bell size={18} className="text-blue-500" />
            ) : (
              <BellOff size={18} className="text-text-muted" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-text-main">
              Notifications
            </div>
            <div className="text-xs text-text-muted">
              Receive alert notifications and milestone reminders
            </div>
          </div>
        </div>

        <Switch
          checked={notifications}
          onChange={setNotifications}
          aria-label="Toggle notifications"
        />
      </motion.div>

      {/* Language Row Card with custom Select */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
            <Globe size={18} className="text-text-muted" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-main">
              Interface Language
            </div>
            <div className="text-xs text-text-muted">
              Select your preferred interface display language
            </div>
          </div>
        </div>

        <div className="w-full sm:w-[190px] shrink-0">
          <Select
            size="sm"
            value={language}
            onChange={(val) => setLanguage(val)}
            options={LANGUAGE_OPTIONS}
            className="w-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
