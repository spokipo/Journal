import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'time' | 'system';

export interface TimeSchedule {
  dayStart: number; // Hour of day 0-23 (e.g. 7 for 07:00)
  nightStart: number; // Hour of day 0-23 (e.g. 20 for 20:00)
}

export const STORAGE_KEYS = {
  THEME: 'theme',
  MODE: 'theme_mode',
  DAY_START: 'theme_day_start',
  NIGHT_START: 'theme_night_start',
} as const;

export const DEFAULT_SCHEDULE: TimeSchedule = {
  dayStart: 7,
  nightStart: 20,
};

const THEME_CHANGE_EVENT = 'journal-theme-change';

/**
 * Checks if a given hour falls into daytime according to the schedule.
 */
export function isDaytime(hour: number, schedule: TimeSchedule = DEFAULT_SCHEDULE): boolean {
  const { dayStart, nightStart } = schedule;
  if (dayStart <= nightStart) {
    return hour >= dayStart && hour < nightStart;
  }
  // Schedule wraps across midnight (e.g. dayStart: 22, nightStart: 6)
  return hour >= dayStart || hour < nightStart;
}

/**
 * Reads the time schedule from localStorage.
 */
export function getStoredSchedule(): TimeSchedule {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE;
  try {
    const rawDay = localStorage.getItem(STORAGE_KEYS.DAY_START);
    const rawNight = localStorage.getItem(STORAGE_KEYS.NIGHT_START);
    const dayStart = rawDay !== null ? parseInt(rawDay, 10) : DEFAULT_SCHEDULE.dayStart;
    const nightStart = rawNight !== null ? parseInt(rawNight, 10) : DEFAULT_SCHEDULE.nightStart;
    return {
      dayStart: isNaN(dayStart) || dayStart < 0 || dayStart > 23 ? DEFAULT_SCHEDULE.dayStart : dayStart,
      nightStart: isNaN(nightStart) || nightStart < 0 || nightStart > 23 ? DEFAULT_SCHEDULE.nightStart : nightStart,
    };
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

/**
 * Reads the current theme mode preference from localStorage.
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const storedMode = localStorage.getItem(STORAGE_KEYS.MODE);
    if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'time' || storedMode === 'system') {
      return storedMode;
    }
    // Backward compatibility: check 'theme' key
    const legacyTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      return legacyTheme;
    }
    return 'system';
  } catch {
    return 'system';
  }
}

/**
 * Resolves whether 'light' or 'dark' should be active based on mode and device time/system settings.
 */
export function resolveTheme(mode: ThemeMode, schedule: TimeSchedule = DEFAULT_SCHEDULE): Theme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  if (mode === 'time') {
    const currentHour = new Date().getHours();
    return isDaytime(currentHour, schedule) ? 'light' : 'dark';
  }
  // 'system'
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Updates DOM root class and meta theme-color tag.
 */
export function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-color-meta')?.setAttribute('content', '#0c0e14');
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('theme-color-meta')?.setAttribute('content', '#f4f5f8');
  }
}

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getStoredThemeMode);
  const [schedule, setScheduleState] = useState<TimeSchedule>(getStoredSchedule);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Keep DOM and state synchronized
  const syncActiveTheme = useCallback((mode: ThemeMode, sched: TimeSchedule) => {
    const resolved = resolveTheme(mode, sched);
    setThemeState(resolved);
    applyThemeToDOM(resolved);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, resolved);
    } catch {}
  }, []);

  // Listen for changes from other components and tabs
  useEffect(() => {
    const handleThemeEvent = () => {
      const currentMode = getStoredThemeMode();
      const currentSchedule = getStoredSchedule();
      setThemeModeState(currentMode);
      setScheduleState(currentSchedule);
      syncActiveTheme(currentMode, currentSchedule);
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
    window.addEventListener('storage', handleThemeEvent);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
      window.removeEventListener('storage', handleThemeEvent);
    };
  }, [syncActiveTheme]);

  // Handle system preference change
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleMediaChange = () => {
      if (themeMode === 'system') {
        syncActiveTheme('system', schedule);
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [themeMode, schedule, syncActiveTheme]);

  // Periodic check for device time changes (every 30 seconds)
  useEffect(() => {
    if (themeMode !== 'time') return;

    // Run immediate check
    syncActiveTheme('time', schedule);

    const interval = setInterval(() => {
      syncActiveTheme('time', schedule);
    }, 30000);

    return () => clearInterval(interval);
  }, [themeMode, schedule, syncActiveTheme]);

  // Set theme mode (light, dark, time, system)
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, newMode);
    } catch {}

    syncActiveTheme(newMode, schedule);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  }, [schedule, syncActiveTheme]);

  // Set schedule hours for day/night
  const setSchedule = useCallback((newSchedule: TimeSchedule) => {
    setScheduleState(newSchedule);
    try {
      localStorage.setItem(STORAGE_KEYS.DAY_START, String(newSchedule.dayStart));
      localStorage.setItem(STORAGE_KEYS.NIGHT_START, String(newSchedule.nightStart));
    } catch {}

    if (themeMode === 'time') {
      syncActiveTheme('time', newSchedule);
    }
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  }, [themeMode, syncActiveTheme]);

  // Toggle theme directly (sets mode to opposite manual theme)
  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
  }, [theme, setThemeMode]);

  // Backward-compatible direct setTheme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeMode(newTheme);
  }, [setThemeMode]);

  return {
    theme,
    themeMode,
    schedule,
    setThemeMode,
    setSchedule,
    toggleTheme,
    setTheme,
  };
}

