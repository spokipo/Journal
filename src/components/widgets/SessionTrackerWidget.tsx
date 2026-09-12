import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Clock } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

interface ZonedTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string; // 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'
}

function getZonedTime(date: Date, timeZone: string): ZonedTime {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    weekday: map.weekday,
  };
}

function getUtcOffsetHours(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return Math.round((tzDate.getTime() - utcDate.getTime()) / 3600000);
}

function formatUtcToLocal(utcHour: number, utcMinute: number = 0): string {
  const d = new Date();
  const utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), utcHour, utcMinute, 0));
  return utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface ActiveSessionModel {
  key: 'ASIA' | 'LONDON' | 'LUNCH' | 'NY';
  name: string;
  shortName: string;
  utcRange: string;
  localRange: string;
  localStart: string;
  localEnd: string;
  progressPercent: number;
  remainingStr: string;
  statusDotClass: string;
  statusTextClass: string;
  badgeStyle: string;
  progressBg: string;
}

interface UpcomingSessionModel {
  name: string;
  shortName: string;
  inStr: string;
  localStart: string;
  utcRange: string;
}

interface SessionScheduleItem {
  key: string;
  name: string;
  utcRange: string;
  localRange: string;
  status: 'Active' | 'Upcoming' | 'Closed';
  badgeClass: string;
  dotClass: string;
}

export function SessionTrackerWidget({ size }: WidgetProps) {
  const [localTimeStr, setLocalTimeStr] = useState('');
  const [localSecondsStr, setLocalSecondsStr] = useState('');
  const [localDateStr, setLocalDateStr] = useState('');
  const [localOffsetStr, setLocalOffsetStr] = useState('UTC');
  const [isWeekend, setIsWeekend] = useState(false);
  const [weekendTimer, setWeekendTimer] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSessionModel | null>(null);
  const [nextSession, setNextSession] = useState<UpcomingSessionModel>({
    name: 'Asian Session',
    shortName: 'Asia',
    inStr: '',
    localStart: '02:00',
    utcRange: '00:00–07:00 UTC',
  });
  const [dailySchedule, setDailySchedule] = useState<SessionScheduleItem[]>([]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');

      // 1. Device Local Time & Date
      const lh = pad(now.getHours());
      const lm = pad(now.getMinutes());
      const ls = pad(now.getSeconds());
      setLocalTimeStr(`${lh}:${lm}`);
      setLocalSecondsStr(ls);
      setLocalDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

      // Device timezone offset
      const offsetMin = -now.getTimezoneOffset();
      const offsetHours = offsetMin / 60;
      const offsetSign = offsetHours >= 0 ? '+' : '';
      setLocalOffsetStr(`UTC${offsetSign}${offsetHours}`);

      // 2. NY Timezone & Weekend Market Check (Friday 17:00 NY to Sunday 17:00 NY)
      const ny = getZonedTime(now, 'America/New_York');
      const isMarketClosed =
        (ny.weekday === 'Fri' && ny.hour >= 17) ||
        ny.weekday === 'Sat' ||
        (ny.weekday === 'Sun' && ny.hour < 17);

      const nyOffset = getUtcOffsetHours(now, 'America/New_York'); // -4 in EDT, -5 in EST
      const nyStartUtcHour = 8 - nyOffset; // 12:00 UTC in EDT, 13:00 UTC in EST
      const nyEndUtcHour = 12 - nyOffset;  // 16:00 UTC in EDT, 17:00 UTC in EST

      const nowUtcSec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();

      const asiaStartSec = 0;
      const asiaEndSec = 7 * 3600;

      const londonStartSec = 7 * 3600;
      const londonEndSec = 10 * 3600;

      const lunchStartSec = 10 * 3600;
      const lunchEndSec = nyStartUtcHour * 3600;

      const nyStartSec = nyStartUtcHour * 3600;
      const nyEndSec = nyEndUtcHour * 3600;

      // Build daily schedule items (used in large widget)
      const scheduleDefs = [
        {
          key: 'ASIA',
          name: 'Asian Session',
          utcRange: '00:00–07:00 UTC',
          localRange: `${formatUtcToLocal(0, 0)}–${formatUtcToLocal(7, 0)}`,
          startSec: asiaStartSec,
          endSec: asiaEndSec,
          activeBadge: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
          activeDot: 'bg-cyan-500 animate-pulse',
        },
        {
          key: 'LONDON',
          name: 'London Killzone',
          utcRange: '07:00–10:00 UTC',
          localRange: `${formatUtcToLocal(7, 0)}–${formatUtcToLocal(10, 0)}`,
          startSec: londonStartSec,
          endSec: londonEndSec,
          activeBadge: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          activeDot: 'bg-emerald-500 animate-pulse',
        },
        {
          key: 'LUNCH',
          name: 'London Lunch',
          utcRange: `10:00–${pad(nyStartUtcHour)}:00 UTC`,
          localRange: `${formatUtcToLocal(10, 0)}–${formatUtcToLocal(nyStartUtcHour, 0)}`,
          startSec: lunchStartSec,
          endSec: lunchEndSec,
          activeBadge: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          activeDot: 'bg-amber-500 animate-pulse',
        },
        {
          key: 'NY',
          name: 'New York Session',
          utcRange: `${pad(nyStartUtcHour)}:00–${pad(nyEndUtcHour)}:00 UTC`,
          localRange: `${formatUtcToLocal(nyStartUtcHour, 0)}–${formatUtcToLocal(nyEndUtcHour, 0)}`,
          startSec: nyStartSec,
          endSec: nyEndSec,
          activeBadge: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
          activeDot: 'bg-blue-500 animate-pulse',
        },
      ];

      setDailySchedule(
        scheduleDefs.map((def) => {
          let status: 'Active' | 'Upcoming' | 'Closed' = 'Closed';
          let badgeClass = 'bg-canvas text-text-muted border border-border-card';
          let dotClass = 'bg-text-muted/40';

          if (isMarketClosed) {
            status = 'Closed';
          } else if (nowUtcSec >= def.startSec && nowUtcSec < def.endSec) {
            status = 'Active';
            badgeClass = def.activeBadge;
            dotClass = def.activeDot;
          } else if (nowUtcSec < def.startSec) {
            status = 'Upcoming';
            badgeClass = 'bg-canvas text-text-muted border border-border-card';
            dotClass = 'bg-blue-500/50';
          } else {
            status = 'Closed';
          }

          return {
            key: def.key,
            name: def.name,
            utcRange: def.utcRange,
            localRange: def.localRange,
            status,
            badgeClass,
            dotClass,
          };
        })
      );

      if (isMarketClosed) {
        setIsWeekend(true);
        setActiveSession(null);

        let hoursRemaining = 0;
        if (ny.weekday === 'Fri') {
          hoursRemaining = (23 - ny.hour) + 24 + 17;
        } else if (ny.weekday === 'Sat') {
          hoursRemaining = (23 - ny.hour) + 17;
        } else if (ny.weekday === 'Sun') {
          hoursRemaining = (16 - ny.hour);
        }

        const minsRemaining = 59 - ny.minute;
        const secsRemaining = 59 - ny.second;
        const totalSecs = Math.max(0, hoursRemaining * 3600 + minsRemaining * 60 + secsRemaining);

        const d = Math.floor(totalSecs / 86400);
        const h = Math.floor((totalSecs % 86400) / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);

        if (d > 0) {
          setWeekendTimer(`Opens in ${d}d ${h}h ${m}m`);
        } else {
          setWeekendTimer(`Opens in ${h}h ${m}m`);
        }
        return;
      }

      setIsWeekend(false);

      const formatRemaining = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m left`;
        return `${m}m ${sec % 60}s left`;
      };

      const formatInStr = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
      };

      if (nowUtcSec >= asiaStartSec && nowUtcSec < asiaEndSec) {
        const elapsed = nowUtcSec - asiaStartSec;
        const total = asiaEndSec - asiaStartSec;
        const remaining = asiaEndSec - nowUtcSec;
        setActiveSession({
          key: 'ASIA',
          name: 'Asian Session',
          shortName: 'Asia',
          utcRange: '00:00–07:00 UTC',
          localRange: `${formatUtcToLocal(0, 0)}–${formatUtcToLocal(7, 0)}`,
          localStart: formatUtcToLocal(0, 0),
          localEnd: formatUtcToLocal(7, 0),
          progressPercent: Math.min(100, Math.round((elapsed / total) * 100)),
          remainingStr: formatRemaining(remaining),
          statusDotClass: 'bg-cyan-500 animate-pulse',
          statusTextClass: 'text-text-main',
          badgeStyle: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
          progressBg: 'bg-cyan-500',
        });
      } else if (nowUtcSec >= londonStartSec && nowUtcSec < londonEndSec) {
        const elapsed = nowUtcSec - londonStartSec;
        const total = londonEndSec - londonStartSec;
        const remaining = londonEndSec - nowUtcSec;
        setActiveSession({
          key: 'LONDON',
          name: 'London Killzone',
          shortName: 'London KZ',
          utcRange: '07:00–10:00 UTC',
          localRange: `${formatUtcToLocal(7, 0)}–${formatUtcToLocal(10, 0)}`,
          localStart: formatUtcToLocal(7, 0),
          localEnd: formatUtcToLocal(10, 0),
          progressPercent: Math.min(100, Math.round((elapsed / total) * 100)),
          remainingStr: formatRemaining(remaining),
          statusDotClass: 'bg-emerald-500 animate-pulse',
          statusTextClass: 'text-text-main',
          badgeStyle: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          progressBg: 'bg-emerald-500',
        });
      } else if (nowUtcSec >= lunchStartSec && nowUtcSec < lunchEndSec) {
        const elapsed = nowUtcSec - lunchStartSec;
        const total = lunchEndSec - lunchStartSec;
        const remaining = lunchEndSec - nowUtcSec;
        setActiveSession({
          key: 'LUNCH',
          name: 'London Lunch',
          shortName: 'Lunch Break',
          utcRange: `10:00–${pad(nyStartUtcHour)}:00 UTC`,
          localRange: `${formatUtcToLocal(10, 0)}–${formatUtcToLocal(nyStartUtcHour, 0)}`,
          localStart: formatUtcToLocal(10, 0),
          localEnd: formatUtcToLocal(nyStartUtcHour, 0),
          progressPercent: Math.min(100, Math.round((elapsed / total) * 100)),
          remainingStr: formatRemaining(remaining),
          statusDotClass: 'bg-amber-500 animate-pulse',
          statusTextClass: 'text-amber-500',
          badgeStyle: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          progressBg: 'bg-amber-500',
        });
      } else if (nowUtcSec >= nyStartSec && nowUtcSec < nyEndSec) {
        const elapsed = nowUtcSec - nyStartSec;
        const total = nyEndSec - nyStartSec;
        const remaining = nyEndSec - nowUtcSec;
        setActiveSession({
          key: 'NY',
          name: 'New York Session',
          shortName: 'New York',
          utcRange: `${pad(nyStartUtcHour)}:00–${pad(nyEndUtcHour)}:00 UTC`,
          localRange: `${formatUtcToLocal(nyStartUtcHour, 0)}–${formatUtcToLocal(nyEndUtcHour, 0)}`,
          localStart: formatUtcToLocal(nyStartUtcHour, 0),
          localEnd: formatUtcToLocal(nyEndUtcHour, 0),
          progressPercent: Math.min(100, Math.round((elapsed / total) * 100)),
          remainingStr: formatRemaining(remaining),
          statusDotClass: 'bg-blue-500 animate-pulse',
          statusTextClass: 'text-text-main',
          badgeStyle: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
          progressBg: 'bg-blue-500',
        });
      } else {
        // Off-Hours (Between NY Close and Asia Open 00:00 UTC)
        setActiveSession(null);
        const untilAsiaSec = (24 * 3600 - nowUtcSec) + asiaStartSec;
        setNextSession({
          name: 'Asian Session',
          shortName: 'Asia',
          inStr: formatInStr(untilAsiaSec),
          localStart: formatUtcToLocal(0, 0),
          utcRange: '00:00–07:00 UTC',
        });
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const statusDotClass = isWeekend
    ? 'bg-amber-500'
    : activeSession
      ? activeSession.statusDotClass
      : 'bg-blue-500/70';

  const statusTextClass = isWeekend
    ? 'text-amber-500'
    : activeSession
      ? activeSession.statusTextClass
      : 'text-text-muted';

  // Small (1x1): Glanceable local time + current market status + countdown
  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between text-left select-none">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">
            <Clock size={14} className={isWeekend ? "text-amber-500" : activeSession ? "text-emerald-500" : "text-blue-500"} />
            <span>Session Clock</span>
          </div>
          <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-canvas border border-border-card text-text-muted font-mono">
            {localOffsetStr}
          </span>
        </div>

        {/* Center Glanceable Value */}
        <div className="my-auto">
          <div className="text-2xl font-bold tabular-nums font-mono text-text-main tracking-tight flex items-baseline gap-1">
            <span>{localTimeStr || '00:00'}</span>
            <span className="text-xs text-text-muted font-normal">:{localSecondsStr}</span>
          </div>
          <div className="text-xs mt-1 flex items-center gap-2 truncate">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotClass)} />
            <span className={cn("font-semibold truncate", statusTextClass)}>
              {isWeekend 
                ? 'Market Closed' 
                : activeSession 
                  ? activeSession.name 
                  : 'Between Sessions'}
            </span>
          </div>
        </div>

        {/* Footer Supporting Text */}
        <div className="pt-2 border-t border-border-card flex items-center justify-between text-[0.6875rem] font-mono">
          {isWeekend ? (
            <span className="text-amber-500 font-semibold truncate">{weekendTimer}</span>
          ) : activeSession ? (
            <>
              <span className="text-text-muted truncate">{activeSession.localRange}</span>
              <span className="text-emerald-500 font-bold ml-1 shrink-0">{activeSession.remainingStr}</span>
            </>
          ) : (
            <span className="text-text-muted truncate">Next: {nextSession.shortName} in {nextSession.inStr}</span>
          )}
        </div>
      </WidgetCard>
    );
  }

  // Supporting Session Card (Right Side in Medium / Top-Right in Large)
  const renderSessionCard = () => (
    <div className="w-52 shrink-0 h-full rounded-[14px] bg-canvas border border-border-card p-3 flex flex-col justify-between">
      {isWeekend ? (
        <>
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Weekend
            </span>
            <span className="text-[0.6875rem] font-mono text-text-muted">Reopens Sun</span>
          </div>

          <div className="my-auto">
            <div className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">Countdown</div>
            <div className="text-sm font-bold font-mono text-amber-500 tabular-nums mt-0.5">
              {weekendTimer}
            </div>
          </div>

          <div className="text-[0.6875rem] text-text-muted font-mono pt-2 border-t border-border-card flex items-center justify-between">
            <span>Open: 17:00 NY</span>
            <span>00:00 UTC</span>
          </div>
        </>
      ) : activeSession ? (
        <>
          <div className="flex items-center justify-between">
            <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase", activeSession.badgeStyle)}>
              {activeSession.shortName}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-500 tabular-nums">
              {activeSession.remainingStr}
            </span>
          </div>

          <div className="my-auto">
            <div className="text-sm font-bold font-mono text-text-main tracking-tight">
              {activeSession.localRange}
            </div>
            <div className="text-[0.6875rem] font-mono text-text-muted mt-0.5">
              {activeSession.utcRange}
            </div>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-[0.6875rem] text-text-muted font-mono mb-1">
              <span>Progress</span>
              <span className="font-semibold text-text-main">{activeSession.progressPercent}%</span>
            </div>
            <div className="w-full bg-card rounded-full h-1.5 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-300", activeSession.progressBg)} 
                style={{ width: `${activeSession.progressPercent}%` }} 
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Off-Hours
            </span>
            <span className="text-xs font-mono font-semibold text-text-muted tabular-nums">
              in {nextSession.inStr}
            </span>
          </div>

          <div className="my-auto">
            <div className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold">Next Session</div>
            <div className="text-sm font-bold text-text-main mt-0.5">{nextSession.name}</div>
            <div className="text-xs font-mono text-text-muted mt-0.5">
              {nextSession.localStart} <span className="text-[0.6875rem]">({nextSession.utcRange})</span>
            </div>
          </div>

          <div className="text-[0.6875rem] text-text-muted font-mono pt-2 border-t border-border-card truncate">
            Sydney / Tokyo open
          </div>
        </>
      )}
    </div>
  );

  // Medium (2x1) per design.md: Label -> Value on left, Single Active Session Supporting Card on right
  if (size === 'medium') {
    return (
      <WidgetCard 
        title="Session Clock" 
        size={size}
        action={
          <span className="text-[0.6875rem] font-mono font-medium text-text-muted px-2 py-0.5 rounded-full bg-canvas border border-border-card">
            {localOffsetStr}
          </span>
        }
      >
        <div className="flex items-center justify-between gap-4 flex-1 h-full select-none">
          {/* Left Side: Local Time & Current Status */}
          <div className="flex flex-col justify-between h-full min-w-0 flex-1">
            <div>
              <div className="text-3xl font-bold font-mono tabular-nums text-text-main tracking-tight flex items-baseline gap-1">
                <span>{localTimeStr || '00:00'}</span>
                <span className="text-sm text-text-muted font-normal">:{localSecondsStr}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotClass)} />
                <span className={cn("text-xs font-semibold truncate", statusTextClass)}>
                  {isWeekend 
                    ? 'Market Closed' 
                    : activeSession 
                      ? activeSession.name 
                      : 'Between Sessions'}
                </span>
              </div>
            </div>

            <div className="text-[0.6875rem] font-mono text-text-muted">
              {localDateStr}
            </div>
          </div>

          {/* Right Side: Dedicated Session Card */}
          {renderSessionCard()}
        </div>
      </WidgetCard>
    );
  }

  // Large (2x2) per design.md: Top section identical to Medium, Bottom section full daily schedule timeline
  return (
    <WidgetCard 
      title="Session Clock" 
      size={size}
      action={
        <span className="text-[0.6875rem] font-mono font-medium text-text-muted px-2 py-0.5 rounded-full bg-canvas border border-border-card">
          {localOffsetStr}
        </span>
      }
    >
      <div className="flex flex-col justify-between flex-1 h-full select-none gap-3">
        {/* Top Half: Clock + Active Session Card */}
        <div className="flex items-center justify-between gap-4 h-[118px] shrink-0">
          <div className="flex flex-col justify-between h-full min-w-0 flex-1">
            <div>
              <div className="text-3xl font-bold font-mono tabular-nums text-text-main tracking-tight flex items-baseline gap-1">
                <span>{localTimeStr || '00:00'}</span>
                <span className="text-sm text-text-muted font-normal">:{localSecondsStr}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDotClass)} />
                <span className={cn("text-xs font-semibold truncate", statusTextClass)}>
                  {isWeekend 
                    ? 'Market Closed' 
                    : activeSession 
                      ? activeSession.name 
                      : 'Between Sessions'}
                </span>
              </div>
            </div>

            <div className="text-[0.6875rem] font-mono text-text-muted">
              {localDateStr}
            </div>
          </div>

          {renderSessionCard()}
        </div>

        {/* Bottom Half: Full Day Sessions Schedule */}
        <div className="pt-3 border-t border-border-card flex flex-col justify-between flex-1 min-h-0">
          <div className="text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold mb-1.5">
            Daily Sessions Schedule
          </div>
          <div className="flex flex-col gap-2 justify-between flex-1">
            {dailySchedule.map((item) => (
              <div 
                key={item.key} 
                className="flex items-center justify-between px-3 py-1.5 rounded-[14px] bg-canvas border border-border-card text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.dotClass)} />
                  <span className="font-medium text-text-main truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono shrink-0">
                  <span className="text-[0.6875rem] text-text-muted">{item.localRange}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase", item.badgeClass)}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
