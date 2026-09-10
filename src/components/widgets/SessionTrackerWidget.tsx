import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Clock } from 'lucide-react';
import type { WidgetProps } from './types';
import { WidgetCard } from './common/WidgetCard';

export function SessionTrackerWidget({ size }: WidgetProps) {
  const [localTimeStr, setLocalTimeStr] = useState('');
  const [timeZoneOffsetStr, setTimeZoneOffsetStr] = useState('');
  const [sessionName, setSessionName] = useState('London');
  const [sessionRemaining, setSessionRemaining] = useState('');
  const [isWeekend, setIsWeekend] = useState(false);
  const [activeSessionKey, setActiveSessionKey] = useState<'ASIA' | 'LONDON' | 'NY' | 'NONE'>('NONE');

  useEffect(() => {
    const updateSession = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      
      // Device local time
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      setLocalTimeStr(`${pad(h)}:${pad(m)}:${pad(s)}`);

      // Device timezone offset
      const offsetMin = -now.getTimezoneOffset();
      const sign = offsetMin >= 0 ? '+' : '-';
      const offH = Math.floor(Math.abs(offsetMin) / 60);
      const offM = Math.abs(offsetMin) % 60;
      setTimeZoneOffsetStr(`UTC${sign}${offH}${offM > 0 ? `:${pad(offM)}` : ''}`);

      // Weekend detection: Friday 21:00 UTC to Sunday 21:00 UTC
      const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();

      const isMarketClosed = 
        dayOfWeek === 6 || // Saturday
        (dayOfWeek === 5 && utcHours >= 21) || // Friday night
        (dayOfWeek === 0 && utcHours < 21); // Sunday before open

      if (isMarketClosed) {
        setIsWeekend(true);
        setActiveSessionKey('NONE');
        setSessionName('Closed');

        // Target: next Sunday 21:00 UTC
        const nextOpen = new Date(now);
        const daysUntilSunday = (7 - dayOfWeek) % 7;
        nextOpen.setUTCDate(now.getUTCDate() + (dayOfWeek === 0 ? 0 : daysUntilSunday));
        nextOpen.setUTCHours(21, 0, 0, 0);

        let diffMs = nextOpen.getTime() - now.getTime();
        if (diffMs < 0) diffMs = 0;
        const totalHours = Math.floor(diffMs / 3600000);
        const totalMins = Math.floor((diffMs % 3600000) / 60000);

        if (totalHours >= 24) {
          const days = Math.floor(totalHours / 24);
          const remH = totalHours % 24;
          setSessionRemaining(`Opens in ${days}d ${remH}h`);
        } else {
          setSessionRemaining(`Opens in ${totalHours}h ${totalMins}m`);
        }
        return;
      }

      setIsWeekend(false);

      // Clean Killzones / Trading Sessions (UTC standard):
      // Asia: 00:00 - 08:00 UTC
      // London: 07:00 - 15:00 UTC
      // New York: 12:00 - 21:00 UTC
      if (utcHours >= 12 && utcHours < 21) {
        setActiveSessionKey('NY');
        setSessionName('New York');
        const remH = 20 - utcHours;
        const remM = 59 - utcMinutes;
        setSessionRemaining(`${remH}h ${remM}m left`);
      } else if (utcHours >= 7 && utcHours < 15) {
        setActiveSessionKey('LONDON');
        setSessionName('London');
        const remH = 14 - utcHours;
        const remM = 59 - utcMinutes;
        setSessionRemaining(`${remH}h ${remM}m left`);
      } else if (utcHours >= 0 && utcHours < 8) {
        setActiveSessionKey('ASIA');
        setSessionName('Asia');
        const remH = 7 - utcHours;
        const remM = 59 - utcMinutes;
        setSessionRemaining(`${remH}h ${remM}m left`);
      } else if (utcHours >= 21) {
        setActiveSessionKey('NONE');
        setSessionName('Pre-Asia');
        const remH = 23 - utcHours;
        const remM = 59 - utcMinutes;
        setSessionRemaining(`Asia in ${remH}h ${remM}m`);
      } else {
        setActiveSessionKey('NONE');
        setSessionName('Off-Hours');
        setSessionRemaining('Pre-market');
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 1000);
    return () => clearInterval(interval);
  }, []);

  if (size === 'small') {
    return (
      <WidgetCard size={size} className="justify-between items-center text-center p-3 sm:p-3.5">
        <div className="w-full flex justify-center pt-0.5">
          <div className={cn(
            "p-2 rounded-full shrink-0",
            isWeekend ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
          )}>
            <Clock size={20} />
          </div>
        </div>

        <div className="my-auto w-full px-1">
          <div className="text-xl sm:text-2xl font-bold tabular-nums text-text-main tracking-tight">
            {localTimeStr.slice(0, 5) || '12:00'}
          </div>
          <div className="mt-1 flex items-center justify-center">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
              isWeekend 
                ? "bg-amber-500/10 text-amber-500" 
                : "bg-blue-500/10 text-blue-500"
            )}>
              {sessionName}
            </span>
          </div>
          <div className="text-[0.6875rem] text-text-muted font-mono mt-1 truncate">
            {sessionRemaining}
          </div>
        </div>

        <div className="text-[0.6875rem] text-text-muted font-mono" title="Device local timezone">
          {timeZoneOffsetStr || 'Local'}
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Trading Sessions" size={size}>
      <div className="flex flex-col justify-between flex-1 h-full min-h-0">
        {/* Top: Current local time & active session */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 sm:h-11 sm:w-11 rounded-[16px] flex items-center justify-center shrink-0",
            isWeekend ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
          )}>
            <Clock size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-bold tabular-nums font-mono text-text-main flex items-baseline gap-1.5">
              <span>{localTimeStr || '12:00:00'}</span>
              <span className="text-[11px] font-medium text-text-muted font-mono">{timeZoneOffsetStr}</span>
            </div>
            <div className="text-xs font-semibold text-text-main flex items-center gap-1.5 truncate mt-0.5">
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isWeekend ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              )} />
              <span className="truncate">
                {isWeekend ? 'Market Closed' : `${sessionName}`}
              </span>
              <span className="text-text-muted font-normal">
                • {sessionRemaining}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom: 3 Clean Killzones in a 3-column grid */}
        <div className="grid grid-cols-3 gap-2 w-full pt-2">
          {[
            { key: 'ASIA', label: 'Asia', hours: '00–08 UTC' },
            { key: 'LONDON', label: 'London', hours: '07–15 UTC' },
            { key: 'NY', label: 'New York', hours: '12–21 UTC' },
          ].map(s => {
            const isActive = activeSessionKey === s.key;
            return (
              <div
                key={s.key}
                className={cn(
                  "px-2 py-1.5 rounded-[14px] border text-center transition-colors flex flex-col justify-center",
                  isActive
                    ? "bg-blue-500/15 border-blue-500/35 text-blue-600 dark:text-blue-400 font-bold"
                    : "bg-canvas border-border-card text-text-muted font-medium opacity-80"
                )}
              >
                <div className="text-xs font-bold leading-tight">{s.label}</div>
                <div className="text-[10px] font-mono leading-tight text-text-muted mt-0.5">{s.hours}</div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetCard>
  );
}

