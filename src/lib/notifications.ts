/**
 * PWA Notification System Utilities
 * Handles browser & standalone PWA notification permissions,
 * Service Worker messaging, preference persistence, and notification dispatch.
 */

const STORAGE_KEYS = {
  ENABLED: 'tj_notifications_enabled',
  MACRO_ALERTS: 'tj_notifications_macro_alerts',
  DAILY_REMINDER: 'tj_notifications_daily_reminder',
  DAILY_REMINDER_TIME: 'tj_notifications_daily_reminder_time',
  LAST_DAILY_REMINDER_DATE: 'tj_notifications_last_daily_date',
  SEEN_MACRO_ALERTS: 'tj_notifications_seen_macro_alerts',
};

export interface NotificationPreferences {
  enabled: boolean;
  macroAlerts: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // "HH:MM" 24h format
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if the current browser environment supports the Notifications API.
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if the application is running in installed standalone PWA mode.
 */
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as any).standalone === true;
  return isStandaloneMedia || isIosStandalone;
}

/**
 * Detect if running on an iOS device.
 * Note: On iOS, Web Push & Web Notifications are ONLY supported when installed to Home Screen (iOS 16.4+).
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

/**
 * Returns the current permission status for notifications.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Load user notification preferences from localStorage.
 */
export function getStoredPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      macroAlerts: true,
      dailyReminder: true,
      dailyReminderTime: '18:00',
    };
  }

  const permission = getNotificationPermission();
  const rawEnabled = localStorage.getItem(STORAGE_KEYS.ENABLED);

  // If permission is denied or unsupported, force disabled
  const isEnabled = permission === 'granted' && (rawEnabled === null ? true : rawEnabled === 'true');

  const rawMacro = localStorage.getItem(STORAGE_KEYS.MACRO_ALERTS);
  const rawDaily = localStorage.getItem(STORAGE_KEYS.DAILY_REMINDER);
  const rawTime = localStorage.getItem(STORAGE_KEYS.DAILY_REMINDER_TIME);

  return {
    enabled: isEnabled,
    macroAlerts: rawMacro === null ? true : rawMacro === 'true',
    dailyReminder: rawDaily === null ? true : rawDaily === 'true',
    dailyReminderTime: rawTime || '18:00',
  };
}

/**
 * Save notification preferences to localStorage.
 */
export function savePreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  if (typeof window !== 'undefined') {
    if (prefs.enabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ENABLED, String(prefs.enabled));
    }
    if (prefs.macroAlerts !== undefined) {
      localStorage.setItem(STORAGE_KEYS.MACRO_ALERTS, String(prefs.macroAlerts));
    }
    if (prefs.dailyReminder !== undefined) {
      localStorage.setItem(STORAGE_KEYS.DAILY_REMINDER, String(prefs.dailyReminder));
    }
    if (prefs.dailyReminderTime !== undefined) {
      localStorage.setItem(STORAGE_KEYS.DAILY_REMINDER_TIME, prefs.dailyReminderTime);
    }
  }
  return getStoredPreferences();
}

/**
 * Request notification permission from the user.
 * Must be triggered by a direct user gesture (e.g. click).
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      savePreferences({ enabled: true });
      // Ensure service worker is registered
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
      }
    } else {
      savePreferences({ enabled: false });
    }
    return result as NotificationPermissionState;
  } catch (error) {
    console.error('[Notification] Error requesting permission:', error);
    return getNotificationPermission();
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

/**
 * Dispatches a notification using the Service Worker registration (required for PWA),
 * falling back to window.Notification if registration is not yet ready.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'trading-journal-alert',
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
    },
    // @ts-ignore
    vibrate: [150, 50, 150],
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, options);
        return true;
      }
    }

    // Fallback if service worker ready is delayed
    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
    };
    return true;
  } catch (err) {
    console.error('[Notification] Failed to show notification:', err);
    return false;
  }
}

/**
 * Triggers a test notification to verify PWA notification delivery.
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const permission = getNotificationPermission();

  if (permission === 'unsupported') {
    return {
      success: false,
      message: 'Web Notifications are not supported in this browser.',
    };
  }

  if (permission !== 'granted') {
    const newPerm = await requestNotificationPermission();
    if (newPerm !== 'granted') {
      return {
        success: false,
        message: 'Notification permission was not granted.',
      };
    }
  }

  const success = await dispatchNotification({
    title: 'Trading Journal 🔔',
    body: 'PWA notifications are working! You will receive macro news alerts and daily review reminders.',
    url: '/settings',
    tag: 'test-pwa-notification',
  });

  return {
    success,
    message: success
      ? 'Test notification sent!'
      : 'Failed to display notification. Please check browser permissions.',
  };
}
