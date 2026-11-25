import { addDays, logicalDay } from './dates';

/**
 * Forecast of the day when every algorithm is learned. Marks never expire (forgetting is handled by the flash-card
 * boxes), so it is the unlearned pool divided by `perDay`, today's quota counting what is already learned today.
 * Fractional `perDay` (an observed pace) is simulated as is.
 */
export interface ForecastInput {
  total: number;
  /** `learned_at` of every currently learned algorithm. */
  learnedAt: readonly number[];
  /** Distinct algorithms already learned today (counted against today's quota). */
  learnedToday: number;
  perDay: number;
  now: number;
  maxDays?: number;
}

export interface Forecast {
  /** Days from today (0 = today). */
  days: number;
  date: Date;
}

const EPS = 1e-6;

function startOfDay(ms: number): Date {
  const d = logicalDay(new Date(ms));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function forecastFinish(input: ForecastInput): Forecast | null {
  const { total, learnedAt, learnedToday, perDay, now, maxDays = 3650 } = input;
  const today = startOfDay(now);
  let pool = Math.max(0, total - learnedAt.length);
  if (pool <= EPS) return { days: 0, date: today };
  if (perDay <= 0) return null;
  for (let day = 0; day <= maxDays; day++) {
    const quota = day === 0 ? Math.max(0, perDay - learnedToday) : perDay;
    pool -= Math.min(quota, pool);
    if (pool <= EPS) return { days: day, date: addDays(today, day) };
  }
  return null;
}

/** Average distinct algorithms per day over the `days` full days before today. */
export function recentPace(counts: Record<string, number>, dayKeys: readonly string[]): number {
  if (dayKeys.length === 0) return 0;
  return dayKeys.reduce((sum, d) => sum + (counts[d] ?? 0), 0) / dayKeys.length;
}
