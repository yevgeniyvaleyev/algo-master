import { addDays, dayKey, daysToMs } from './dates';

/** Day key → number of distinct algorithms learned that day. */
export type DailyCounts = Record<string, number>;

/**
 * Consecutive days (ending today, or yesterday if today's goal is not met yet)
 * on which the daily goal was reached.
 */
export function computeStreak(counts: DailyCounts, goal: number, today: Date = new Date()): number {
  if (goal <= 0) return 0;
  const met = (d: Date) => (counts[dayKey(d)] ?? 0) >= goal;
  let cursor = met(today) ? today : addDays(today, -1);
  let streak = 0;
  while (met(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Marks learned before this timestamp have expired, or null when auto-unmark is off. */
export function expirationCutoff(autoUnmark: boolean, expireDays: number, now: number = Date.now()): number | null {
  if (!autoUnmark) return null;
  return now - daysToMs(Math.max(0, expireDays));
}

export function isGoalMet(learnedToday: number, goal: number): boolean {
  return learnedToday >= goal;
}

/** Entertainment minutes earned today; unlimited (null) once the daily goal is met. */
/**
 * Entertainment minutes left today: earned minutes minus time already spent in blocked apps.
 * null = unlimited (goal met).
 */
export function minutesLeft(learnedToday: number, goal: number, minutesPerAlgo: number, usedMs: number): number | null {
  const earned = earnedMinutes(learnedToday, goal, minutesPerAlgo);
  if (earned == null) return null;
  return Math.max(0, Math.floor(earned - usedMs / 60_000));
}

export function earnedMinutes(learnedToday: number, goal: number, minutesPerAlgo: number): number | null {
  if (isGoalMet(learnedToday, goal)) return null;
  return learnedToday * minutesPerAlgo;
}
