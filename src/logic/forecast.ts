import { addDays } from './dates';

/**
 * Forecast of the day when every algorithm is learned at the same time. Simulated day by day: each day learns
 * `perDay` algorithms from the unlearned pool; with auto-unmark, a mark set on day d expires on day d + expireDays and
 * the algorithm returns to the pool (a refresh). Fractional `perDay` (an observed pace) is simulated as is.
 */
export interface ForecastInput {
  total: number;
  /** `learned_at` of every currently learned algorithm. */
  learnedAt: readonly number[];
  /** Distinct algorithms already learned today (counted against today's quota). */
  learnedToday: number;
  perDay: number;
  /** null when marks never expire. */
  expireDays: number | null;
  now: number;
  maxDays?: number;
}

export interface Forecast {
  /** Days from today (0 = today). */
  days: number;
  date: Date;
  /** Algorithms that expire and have to be learned again before the finish. */
  refreshes: number;
}

const EPS = 1e-6;

function startOfDay(ms: number): Date {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole local days from `from` to `to` (DST-safe). */
function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function forecastFinish(input: ForecastInput): Forecast | null {
  const { total, learnedAt, learnedToday, perDay, expireDays, now, maxDays = 3650 } = input;
  const today = startOfDay(now);
  let pool = Math.max(0, total - learnedAt.length);
  if (pool <= EPS) return { days: 0, date: today, refreshes: 0 };
  if (perDay <= 0) return null;

  const expiring = new Map<number, number>();
  const expireOn = (day: number, amount: number) => expiring.set(day, (expiring.get(day) ?? 0) + amount);
  if (expireDays != null) {
    for (const ts of learnedAt) {
      expireOn(Math.max(0, dayDiff(today, startOfDay(ts + expireDays * 86_400_000))), 1);
    }
  }

  let refreshes = 0;
  for (let day = 0; day <= maxDays; day++) {
    const back = expiring.get(day) ?? 0;
    pool += back;
    refreshes += back;
    const quota = day === 0 ? Math.max(0, perDay - learnedToday) : perDay;
    const take = Math.min(quota, pool);
    pool -= take;
    if (expireDays != null && take > 0) expireOn(day + Math.max(1, expireDays), take);
    if (pool <= EPS) return { days: day, date: addDays(today, day), refreshes: Math.round(refreshes) };
  }
  return null;
}

/**
 * With auto-unmark, at most expireDays × perDay algorithms stay learned at once, so the finish is reachable only if
 * that covers everything. Returns what would be needed otherwise.
 */
export function sustainable(total: number, perDay: number, expireDays: number | null) {
  if (expireDays == null) return { ok: perDay > 0, maxHeld: total, goalNeeded: 1, daysNeeded: 0 };
  const days = Math.max(1, expireDays);
  return {
    ok: perDay * days >= total,
    maxHeld: Math.min(total, Math.floor(perDay * days)),
    goalNeeded: Math.ceil(total / days),
    daysNeeded: perDay > 0 ? Math.ceil(total / perDay) : Infinity,
  };
}

/** Average distinct algorithms per day over the `days` full days before today. */
export function recentPace(counts: Record<string, number>, dayKeys: readonly string[]): number {
  if (dayKeys.length === 0) return 0;
  return dayKeys.reduce((sum, d) => sum + (counts[d] ?? 0), 0) / dayKeys.length;
}
