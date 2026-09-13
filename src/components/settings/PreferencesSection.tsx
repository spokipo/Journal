import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon,
  Sun,
  Clock,
  Laptop,
  Bell,
  BellOff,
  Globe,
  Sparkles,
  Smartphone,
  Send,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import { useTheme, type ThemeMode, isDaytime } from '../../lib/useTheme';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { LANGUAGE_OPTIONS } from './types';
import { cn } from '../../lib/utils';
import {
  isPwaStandalone,
  isIosDevice,
  getNotificationPermission,
  getStoredPreferences,
  savePreferences,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationPreferences,
  type NotificationPermissionState,
} from '../../lib/notifications';

const THEME_MODE_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'light', label: 'Light', sublabel: 'Always light', icon: Sun },
  { id: 'dark', label: 'Dark', sublabel: 'Always dark', icon: Moon },
  { id: 'time', label: 'Device Time', sublabel: 'Auto day / night', icon: Clock },
  { id: 'system', label: 'System', sublabel: 'Match OS theme', icon: Laptop },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const formatted = `${String(i).padStart(2, '0')}:00`;
  return { value: String(i), label: formatted };
});

const REMINDER_TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const formatted = `${String(i).padStart(2, '0')}:00`;
  return { value: formatted, label: formatted };
});

export function PreferencesSection() {
  const { theme, themeMode, schedule, setThemeMode, setSchedule } = useTheme();
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(getStoredPreferences);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(getNotificationPermission);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    setIsStandalone(isPwaStandalone());
    setIsIos(isIosDevice());
    setPermissionState(getNotificationPermission());
  }, []);

  // Live device time clock
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isCurrentDay = useMemo(() => {
    return isDaytime(currentTime.getHours(), schedule);
  }, [currentTime, schedule]);

  const formattedCurrentTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const handleDayStartChange = (val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      setSchedule({ ...schedule, dayStart: parsed });
    }
  };

  const handleNightStartChange = (val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      setSchedule({ ...schedule, nightStart: parsed });
    }
  };

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      if (permissionState !== 'granted') {
        const result = await requestNotificationPermission();
        setPermissionState(result);
        if (result === 'granted') {
          const updated = savePreferences({ enabled: true });
          setNotificationPrefs(updated);
        } else {
          const updated = savePreferences({ enabled: false });
          setNotificationPrefs(updated);
        }
      } else {
        const updated = savePreferences({ enabled: true });
        setNotificationPrefs(updated);
      }
    } else {
      const updated = savePreferences({ enabled: false });
      setNotificationPrefs(updated);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestSending(true);
    setTestResult(null);
    try {
      const res = await sendTestNotification();
      setTestResult(res);
      setPermissionState(getNotificationPermission());
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to send test notification',
      });
    } finally {
      setIsTestSending(false);
      setTimeout(() => {
        setTestResult(null);
      }, 5000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Theme Appearance Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 sm:p-5 bg-canvas border border-border-card rounded-[18px] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
              {themeMode === 'time' ? (
                <Clock size={18} className="text-blue-500" />
              ) : themeMode === 'system' ? (
                <Laptop size={18} className="text-blue-500" />
              ) : theme === 'dark' ? (
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
                Choose interface style or sync automatically with device time
              </div>
            </div>
          </div>

          <div className="self-start sm:self-auto px-3 py-1 rounded-full bg-card border border-border-card text-xs font-medium text-text-muted flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              theme === 'dark' ? "bg-blue-500" : "bg-amber-500"
            )} />
            <span>
              {themeMode === 'time'
                ? `Device Time (${theme === 'dark' ? 'Night' : 'Day'})`
                : themeMode === 'system'
                ? `System (${theme === 'dark' ? 'Dark' : 'Light'})`
                : theme === 'dark'
                ? 'Dark Mode'
                : 'Light Mode'}
            </span>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {THEME_MODE_OPTIONS.map((opt) => {
            const isSelected = themeMode === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThemeMode(opt.id)}
                className={cn(
                  "p-3 rounded-[14px] border text-left flex flex-col justify-between transition-all cursor-pointer select-none active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isSelected
                    ? "bg-blue-500/10 border-blue-500 text-blue-500 shadow-sm ring-1 ring-blue-500/20"
                    : "bg-card border-border-card text-text-muted hover:text-text-main hover:border-blue-500/30"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Icon
                    size={18}
                    className={isSelected ? "text-blue-500" : "text-text-muted"}
                  />
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <div>
                  <div className={cn("text-xs font-semibold", isSelected ? "text-blue-500" : "text-text-main")}>
                    {opt.label}
                  </div>
                  <div className="text-[0.6875rem] text-text-muted mt-0.5">
                    {opt.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Schedule panel for Device Time mode */}
        <AnimatePresence>
          {themeMode === 'time' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden pt-1"
            >
              <div className="p-3.5 bg-card border border-border-card rounded-[16px] space-y-3">
                {/* Live clock info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-border-card/60 pb-3">
                  <div className="flex items-center gap-2 text-text-main font-medium">
                    <Clock size={15} className="text-blue-500 shrink-0" />
                    <span>Device clock:</span>
                    <span className="font-mono bg-canvas px-2 py-0.5 rounded-[8px] border border-border-card text-text-main font-semibold">
                      {formattedCurrentTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    {isCurrentDay ? (
                      <>
                        <Sun size={14} className="text-amber-500 shrink-0" />
                        <span>Daytime active (until {String(schedule.nightStart).padStart(2, '0')}:00)</span>
                      </>
                    ) : (
                      <>
                        <Moon size={14} className="text-blue-500 shrink-0" />
                        <span>Nighttime active (until {String(schedule.dayStart).padStart(2, '0')}:00)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Schedule configuration dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1.5 flex items-center gap-1.5">
                      <Sun size={14} className="text-amber-500" />
                      Day Start (Light Theme)
                    </label>
                    <Select
                      size="sm"
                      value={String(schedule.dayStart)}
                      onChange={handleDayStartChange}
                      options={HOUR_OPTIONS}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1.5 flex items-center gap-1.5">
                      <Moon size={14} className="text-blue-500" />
                      Night Start (Dark Theme)
                    </label>
                    <Select
                      size="sm"
                      value={String(schedule.nightStart)}
                      onChange={handleNightStartChange}
                      options={HOUR_OPTIONS}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="text-[0.6875rem] text-text-muted flex items-center gap-1.5 pt-1">
                  <Sparkles size={12} className="text-blue-500 shrink-0" />
                  <span>The theme will automatically switch at the scheduled hours based on your device clock.</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Notifications Card with PWA status, main Switch & sub-settings */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 sm:p-5 bg-canvas border border-border-card rounded-[18px] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-card border border-border-card flex items-center justify-center shrink-0">
              {notificationPrefs.enabled && permissionState === 'granted' ? (
                <Bell size={18} className="text-blue-500" />
              ) : (
                <BellOff size={18} className="text-text-muted" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-main flex items-center gap-2">
                <span>Notifications</span>
                {isStandalone ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    PWA Installed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-card text-text-muted border border-border-card">
                    <Smartphone size={11} />
                    Browser Mode
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted">
                Receive high-impact economic alerts and daily journaling reminders
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Switch
              checked={notificationPrefs.enabled && permissionState === 'granted'}
              onChange={handleToggleNotifications}
              disabled={permissionState === 'unsupported'}
              aria-label="Toggle notifications"
            />
          </div>
        </div>

        {/* Warning if blocked in browser */}
        {permissionState === 'denied' && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-[14px] text-xs text-rose-500 flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Notifications are blocked</div>
              <div className="text-rose-400/90 text-[0.6875rem] mt-0.5">
                Notifications have been blocked in your browser or device settings. To enable them, tap the site settings / lock icon in your address bar and allow Notifications.
              </div>
            </div>
          </div>
        )}

        {/* Tip for iOS browser mode */}
        {!isStandalone && isIos && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-[14px] text-xs text-blue-400 flex items-start gap-2.5">
            <Smartphone size={16} className="shrink-0 mt-0.5 text-blue-500" />
            <div>
              <div className="font-semibold text-text-main">iOS PWA Installation</div>
              <div className="text-text-muted text-[0.6875rem] mt-0.5">
                On iOS, Apple requires installing the app to your Home Screen (tap <strong>Share</strong> → <strong>Add to Home Screen</strong>) to receive background notifications.
              </div>
            </div>
          </div>
        )}

        {/* Sub-settings accordion when notifications are enabled */}
        <AnimatePresence>
          {notificationPrefs.enabled && permissionState === 'granted' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden pt-1 space-y-3"
            >
              <div className="p-3.5 bg-card border border-border-card rounded-[16px] space-y-3">
                {/* High Impact Macro Alerts */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-card/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[10px] bg-canvas border border-border-card flex items-center justify-center shrink-0">
                      <TrendingUp size={14} className="text-amber-500" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-main">High-Impact News Alerts</div>
                      <div className="text-[0.6875rem] text-text-muted">
                        Alert 15 minutes before CPI, FOMC, and high-impact releases
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.macroAlerts}
                    onChange={(checked) => {
                      const updated = savePreferences({ macroAlerts: checked });
                      setNotificationPrefs(updated);
                    }}
                    aria-label="Toggle high impact macro alerts"
                  />
                </div>

                {/* Daily Journaling Reminder */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-card/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[10px] bg-canvas border border-border-card flex items-center justify-center shrink-0">
                      <CalendarCheck size={14} className="text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-main">Daily Journaling Reminder</div>
                      <div className="text-[0.6875rem] text-text-muted">
                        Reminder to log trades, review mistakes, and score emotional discipline
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {notificationPrefs.dailyReminder && (
                      <div className="w-24">
                        <Select
                          size="sm"
                          value={notificationPrefs.dailyReminderTime}
                          onChange={(val) => {
                            const updated = savePreferences({ dailyReminderTime: val });
                            setNotificationPrefs(updated);
                          }}
                          options={REMINDER_TIME_OPTIONS}
                          className="w-full text-xs font-mono"
                        />
                      </div>
                    )}
                    <Switch
                      checked={notificationPrefs.dailyReminder}
                      onChange={(checked) => {
                        const updated = savePreferences({ dailyReminder: checked });
                        setNotificationPrefs(updated);
                      }}
                      aria-label="Toggle daily journaling reminder"
                    />
                  </div>
                </div>

                {/* Test notification trigger & status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="text-[0.6875rem] text-text-muted flex items-center gap-1.5">
                    <Sparkles size={12} className="text-blue-500 shrink-0" />
                    <span>Test that system notifications are arriving on your device.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    disabled={isTestSending}
                    className={cn(
                      "px-3 py-1.5 rounded-[12px] bg-canvas border border-border-card text-xs font-medium text-text-main",
                      "hover:border-blue-500/40 hover:text-blue-500 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0",
                      isTestSending && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Send size={13} className={cn("text-blue-500", isTestSending && "animate-pulse")} />
                    <span>{isTestSending ? 'Sending...' : 'Send Test Notification'}</span>
                  </button>
                </div>

                {/* Test feedback banner */}
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-2.5 rounded-[12px] text-xs flex items-center gap-2 border",
                      testResult.success
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    )}
                  >
                    {testResult.success ? (
                      <CheckCircle2 size={14} className="shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Language Row Card with custom Select */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-canvas border border-border-card rounded-[18px]"
      >
        <div className="flex items-center gap-3">
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
