import { useEffect } from 'react';
import {
  getStoredPreferences,
  dispatchNotification,
  getNotificationPermission,
} from './notifications';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
const MACRO_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check news feed every 5 mins
const SEEN_ALERTS_KEY = 'tj_notifications_seen_macro_alerts';
const LAST_DAILY_KEY = 'tj_notifications_last_daily_date';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSeenMacroAlerts(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markMacroAlertSeen(eventId: string) {
  try {
    const seen = getSeenMacroAlerts();
    if (!seen.includes(eventId)) {
      // Keep at most 50 recent alert IDs
      const updated = [...seen.slice(-49), eventId];
      localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Check and trigger daily journaling reminder if scheduled time has passed today.
 */
async function checkDailyReminder() {
  const prefs = getStoredPreferences();
  if (!prefs.enabled || !prefs.dailyReminder) return;

  const todayStr = getTodayDateString();
  const lastDate = localStorage.getItem(LAST_DAILY_KEY);
  if (lastDate === todayStr) {
    return; // Already notified today
  }

  const [targetH, targetM] = (prefs.dailyReminderTime || '18:00').split(':').map(Number);
  const now = new Date();
  const curH = now.getHours();
  const curM = now.getMinutes();

  if (curH > targetH || (curH === targetH && curM >= targetM)) {
    const success = await dispatchNotification({
      title: 'Trading Journal 📖',
      body: "Time to review your trading day! Log your executions, emotions, and review key setups.",
      url: '/journal',
      tag: `daily-reminder-${todayStr}`,
    });

    if (success) {
      localStorage.setItem(LAST_DAILY_KEY, todayStr);
    }
  }
}

/**
 * Check upcoming high-impact economic news within the next 20 minutes.
 */
async function checkMacroNewsAlerts() {
  const prefs = getStoredPreferences();
  if (!prefs.enabled || !prefs.macroAlerts) return;

  let events: any[] = [];
  try {
    const res = await fetch('/api/calendar');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.events)) {
        events = data.events;
      }
    }
  } catch {
    // Fallback to locally cached calendar data if offline
    try {
      const cached = localStorage.getItem('dashboard_live_news_v1');
      if (cached) events = JSON.parse(cached);
    } catch {}
  }

  if (!events || events.length === 0) return;

  const now = Date.now();
  const upcomingWindow = 20 * 60 * 1000; // 20 minutes
  const seenAlerts = getSeenMacroAlerts();

  for (const ev of events) {
    if (ev.impact !== 'HIGH') continue;
    const diff = ev.timestamp - now;

    // Event is in the future within 20 mins (and at least 10 seconds ahead)
    if (diff > 10000 && diff <= upcomingWindow) {
      const alertId = `${ev.id || ev.title}_${ev.timestamp}`;
      if (seenAlerts.includes(alertId)) continue;

      const minsLeft = Math.max(1, Math.round(diff / 60000));
      const success = await dispatchNotification({
        title: `⚠️ High Impact: [${ev.currency || 'USD'}] in ${minsLeft}m`,
        body: `${ev.title} is releasing soon. Mind your open positions and risk exposure.`,
        url: '/',
        tag: `macro-${alertId}`,
      });

      if (success) {
        markMacroAlertSeen(alertId);
      }
    }
  }
}

/**
 * React hook to run notification scheduler when the app is mounted and active.
 */
export function useNotificationScheduler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getNotificationPermission() !== 'granted') return;

    // Initial check
    checkDailyReminder();
    checkMacroNewsAlerts();

    // 1-minute ticker for daily reminder
    const dailyTimer = setInterval(() => {
      checkDailyReminder();
    }, CHECK_INTERVAL_MS);

    // 5-minute ticker for macro alerts
    const macroTimer = setInterval(() => {
      checkMacroNewsAlerts();
    }, MACRO_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(dailyTimer);
      clearInterval(macroTimer);
    };
  }, []);
}
