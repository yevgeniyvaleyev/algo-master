import { addDays, logicalDay } from './dates';

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
  /** Flash cards still to review today (daily card minimum); 0 on other days. */
  cardsLeft: number;
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
 * Reminders for today (only those still ahead, and only while the goal or the card minimum isn't met) and for the
 * following days, where nothing is learned yet. Everything is rescheduled whenever progress or settings change, so
 * the counts baked into today's texts stay accurate.
 */
export function planReminders(
  window: ReminderWindow,
  goal: number,
  learnedToday: number,
  now: Date,
  daysAhead: number,
  cardsLeftToday = 0,
): PlannedReminder[] {
  const hours = reminderHours(window);
  const plan: PlannedReminder[] = [];
  for (let d = 0; d < daysAhead; d++) {
    const isToday = d === 0;
    const remaining = Math.max(0, isToday ? goal - learnedToday : goal);
    const cardsLeft = isToday ? Math.max(0, cardsLeftToday) : 0;
    if (remaining <= 0 && cardsLeft <= 0) continue;
    const day = addDays(logicalDay(now), d);
    for (const h of hours) {
      const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
      if (date.getTime() > now.getTime()) plan.push({ date, remaining, cardsLeft, isToday });
    }
  }
  return plan;
}
