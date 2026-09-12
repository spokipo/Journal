export interface EconomicCalendarEvent {
  id: string;
  currency: string;
  title: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  timestamp: number; // epoch ms
  forecast: string;
  previous: string;
}

export interface TodayMacroEvent {
  currency: string;
  time: string;
  title: string;
  forecast: string;
  previous: string;
  impact: 'HIGH' | 'MED' | 'LOW';
}

export interface FormattedCalendarEvent {
  date: string; // "2026-09-11"
  dayOfWeek: string; // "Friday"
  time: string; // "12:30 UTC"
  currency: string;
  title: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  forecast: string;
  previous: string;
}

export interface MacroCalendarContext {
  currentDate: string;
  currentDayOfWeek: string;
  currentTimeUtc: string;
  todayEvents: FormattedCalendarEvent[];
  upcomingEvents: FormattedCalendarEvent[];
  weeklyHighMedEvents: FormattedCalendarEvent[];
  coverageRange: string;
}

const FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let cachedEvents: EconomicCalendarEvent[] = [];
let lastFetchTime = 0;

/**
 * Normalizes raw ForexFactory/FairEconomy feed item into clean EconomicCalendarEvent
 */
function normalizeImpact(impactStr?: string): 'HIGH' | 'MED' | 'LOW' {
  const imp = (impactStr || '').toLowerCase();
  if (imp.includes('high')) return 'HIGH';
  if (imp.includes('med')) return 'MED';
  return 'LOW';
}

export async function fetchWeeklyEconomicEvents(): Promise<EconomicCalendarEvent[]> {
  const now = Date.now();
  if (cachedEvents.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedEvents;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[EconomicCalendar] Failed to fetch live feed: ${res.status} ${res.statusText}`);
      return cachedEvents;
    }

    const rawData = await res.json();
    if (!Array.isArray(rawData)) {
      return cachedEvents;
    }

    const parsed: EconomicCalendarEvent[] = [];

    rawData.forEach((item: any, idx: number) => {
      if (!item || !item.title || !item.date) return;
      const ts = new Date(item.date).getTime();
      if (isNaN(ts)) return;

      const impact = normalizeImpact(item.impact);
      const currency = String(item.country || 'USD').toUpperCase();

      parsed.push({
        id: `ff_${currency}_${ts}_${idx}`,
        currency,
        title: String(item.title).trim(),
        impact,
        timestamp: ts,
        forecast: item.forecast ? String(item.forecast).trim() : '—',
        previous: item.previous ? String(item.previous).trim() : '—',
      });
    });

    parsed.sort((a, b) => a.timestamp - b.timestamp);

    if (parsed.length > 0) {
      cachedEvents = parsed;
      lastFetchTime = now;
    }

    return cachedEvents;
  } catch (err: any) {
    console.error('[EconomicCalendar] Error loading live calendar:', err?.message || err);
    return cachedEvents;
  }
}

/**
 * Returns today's High and Medium impact events formatted for the AI Advisor (CRO).
 */
export async function getTodayMacroEvents(): Promise<TodayMacroEvent[]> {
  const events = await fetchWeeklyEconomicEvents();
  if (!events || events.length === 0) return [];

  const now = new Date();
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  const endOfTodayUtc = startOfTodayUtc + 24 * 60 * 60 * 1000;

  const todayEvents = events.filter((e) => {
    const isToday = e.timestamp >= startOfTodayUtc && e.timestamp <= endOfTodayUtc;
    const isSignificant = e.impact === 'HIGH' || e.impact === 'MED';
    return isToday && isSignificant;
  });

  return todayEvents.map((e) => {
    const d = new Date(e.timestamp);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return {
      currency: e.currency,
      time: `${h}:${m} UTC`,
      title: e.title,
      forecast: e.forecast,
      previous: e.previous,
      impact: e.impact,
    };
  });
}

/**
 * Returns full verified macro context including anchor date, today's events,
 * upcoming events, and weekly High/Med impact events.
 */
export async function getMacroCalendarContext(): Promise<MacroCalendarContext> {
  const events = await fetchWeeklyEconomicEvents();
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const h = now.getUTCHours().toString().padStart(2, '0');
  const m = now.getUTCMinutes().toString().padStart(2, '0');
  const currentTimeUtc = `${h}:${m} UTC`;

  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  const endOfTodayUtc = startOfTodayUtc + 24 * 60 * 60 * 1000;

  const formatEvent = (e: EconomicCalendarEvent): FormattedCalendarEvent => {
    const d = new Date(e.timestamp);
    const evDate = d.toISOString().split('T')[0];
    const evDay = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const evH = d.getUTCHours().toString().padStart(2, '0');
    const evM = d.getUTCMinutes().toString().padStart(2, '0');
    return {
      date: evDate,
      dayOfWeek: evDay,
      time: `${evH}:${evM} UTC`,
      currency: e.currency,
      title: e.title,
      impact: e.impact,
      forecast: e.forecast,
      previous: e.previous,
    };
  };

  const highMedEvents = events.filter((e) => e.impact === 'HIGH' || e.impact === 'MED');

  const todayEvents = highMedEvents
    .filter((e) => e.timestamp >= startOfTodayUtc && e.timestamp <= endOfTodayUtc)
    .map(formatEvent);

  const upcomingEvents = highMedEvents
    .filter((e) => e.timestamp >= now.getTime())
    .map(formatEvent);

  const weeklyHighMedEvents = highMedEvents.map(formatEvent);

  const firstDate = events.length > 0 ? new Date(events[0].timestamp).toISOString().split('T')[0] : '';
  const lastDate = events.length > 0 ? new Date(events[events.length - 1].timestamp).toISOString().split('T')[0] : '';
  const coverageRange = firstDate && lastDate ? `${firstDate} to ${lastDate}` : 'N/A';

  return {
    currentDate,
    currentDayOfWeek,
    currentTimeUtc,
    todayEvents,
    upcomingEvents,
    weeklyHighMedEvents,
    coverageRange,
  };
}
