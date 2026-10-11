import { addDays } from './dates';

export interface ReminderWindow {
  /** First reminder hour (0–23), inclusive. */
  startHour: number;
  /** Last reminder hour (0–23), inclusive. */
  endHour: number;
  /** Hours between reminders (≥ 1). */
  intervalHours: number;
}

export interface PlannedReminder {
  date: Date;
  /** Algorithms still to learn on that day at scheduling time. */
  remaining: number;
  isToday: boolean;
}

/** Reminder hours of a day: startHour, startHour + interval, … up to endHour. */
export function reminderHours({ startHour, endHour, intervalHours }: ReminderWindow): number[] {
  const hours: number[] = [];
  const step = Math.max(1, Math.floor(intervalHours));
  for (let h = startHour; h <= endHour; h += step) hours.push(h);
  return hours;
}

/**
 * Reminders for today (only those still ahead, and only if the goal isn't met yet) and for the following days,
 * where nothing is learned yet. Everything is rescheduled whenever progress or settings change, so the counts
 * baked into today's texts stay accurate.
 */
export function planReminders(
  window: ReminderWindow,
  goal: number,
  learnedToday: number,
  now: Date,
  daysAhead: number,
): PlannedReminder[] {
  const hours = reminderHours(window);
  const plan: PlannedReminder[] = [];
  for (let d = 0; d < daysAhead; d++) {
    const isToday = d === 0;
    const remaining = isToday ? goal - learnedToday : goal;
    if (remaining <= 0) continue;
    const day = addDays(now, d);
    for (const h of hours) {
      const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
      if (date.getTime() > now.getTime()) plan.push({ date, remaining, isToday });
    }
  }
  return plan;
}
