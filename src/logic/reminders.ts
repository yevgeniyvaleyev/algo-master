import { cardsWord } from './card-gate';
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
  isToday: boolean;
  /** That day's goal («Цель в день», successful cards). */
  goal: number;
  /** Successes so far (today only; 0 on later days). */
  done: number;
  /** Reviews and new algorithms still to do today (0 on later days, not known yet). */
  cards: number;
  algos: number;
}

/** Where today stands (from `studyDay`). */
export interface ReminderDay {
  goal: number;
  done: number;
  cards: number;
  algos: number;
}

/** Reminder hours of a day: startHour, startHour + interval, … up to endHour. */
export function reminderHours({ startHour, endHour, intervalHours }: ReminderWindow): number[] {
  const hours: number[] = [];
  const step = Math.max(1, Math.floor(intervalHours));
  for (let h = startHour; h <= endHour; h += step) hours.push(h);
  return hours;
}

/**
 * Reminders for today (only those still ahead, and only while something of the goal is left) and for the following
 * days, where nothing is done yet (`tomorrowGoal` for the next day, a credit installment included; `laterGoal` after
 * it). Everything is rescheduled whenever progress or settings change, so the counts baked into today's texts stay
 * accurate.
 */
export function planReminders(
  window: ReminderWindow,
  today: ReminderDay,
  now: Date,
  daysAhead: number,
  tomorrowGoal: number = today.goal,
  laterGoal: number = tomorrowGoal,
): PlannedReminder[] {
  const hours = reminderHours(window);
  const plan: PlannedReminder[] = [];
  for (let d = 0; d < daysAhead; d++) {
    const isToday = d === 0;
    const entry = isToday
      ? { isToday, ...today }
      : { isToday, goal: d === 1 ? tomorrowGoal : laterGoal, done: 0, cards: 0, algos: 0 };
    if (isToday ? entry.cards + entry.algos <= 0 : entry.goal <= 0) continue;
    const day = addDays(logicalDay(now), d);
    for (const h of hours) {
      const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
      if (date.getTime() > now.getTime()) plan.push({ date, ...entry });
    }
  }
  return plan;
}

export function algosWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'алгоритм';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'алгоритма';
  return 'алгоритмов';
}

/** Title and text of a planned reminder notification (also shown by the dev preview). */
export function reminderContent(r: PlannedReminder): { title: string; body: string } {
  if (!r.isToday) {
    return { title: 'Дневная цель', body: `Цель на сегодня — ${r.goal} ${cardsWord(r.goal)}. Пора начинать!` };
  }
  const todo = [
    r.cards > 0 ? `повторить ${r.cards} ${cardsWord(r.cards)}` : '',
    r.algos > 0 ? `изучить ${r.algos} ${algosWord(r.algos)}` : '',
  ].filter(Boolean);
  return {
    title: 'Дневная цель не выполнена',
    body: `Выполнено ${r.done} из ${r.goal}. Осталось ${todo.join(' и ')}.`,
  };
}
