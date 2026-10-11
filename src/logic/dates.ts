const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day as 'YYYY-MM-DD'. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
