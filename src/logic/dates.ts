const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hour (0–6) at which the app's day starts (setting «Новый день с»): before it, time still belongs to the previous
 * day. Module state so every `dayKey()` follows it; set from the settings store on hydrate and update.
 */
let dayStartHour = 0;

export function setDayStartHour(hour: number): void {
  dayStartHour = hour;
}

export function getDayStartHour(): number {
  return dayStartHour;
}

/** `date` moved back by the day start hour, so its calendar day is the app's day (DST-safe). */
export function logicalDay(date: Date = new Date()): Date {
  if (dayStartHour === 0) return new Date(date);
  const d = new Date(date);
  d.setHours(d.getHours() - dayStartHour);
  return d;
}

/** Calendar day of `date` as 'YYYY-MM-DD', ignoring the day start hour (for dates that already are days). */
export function calendarKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The app's day of a moment as 'YYYY-MM-DD' (local calendar day, shifted by the day start hour). */
export function dayKey(date: Date = new Date()): string {
  return calendarKey(logicalDay(date));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Last `count` day keys ending with `today`, oldest first. */
export function lastDays(count: number, today: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => dayKey(addDays(today, i - count + 1)));
}

export function daysToMs(days: number): number {
  return days * DAY_MS;
}
