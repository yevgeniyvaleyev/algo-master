import type { Difficulty } from '@/content/types';

/**
 * Adaptive entertainment budget. The learning day runs from `startHour` to `endHour` (the deadline for the daily
 * goal). Each algorithm still ahead reserves its estimated learning time (base × difficulty factor); whatever is left
 * until the deadline is slack. Learning an algorithm grants a share of the slack, capped at `maxGrantMs`, and the
 * spendable balance is additionally capped by the current slack, so the goal stays reachable before the deadline.
 */

export type DifficultyFactors = Record<Difficulty, number>;

export interface UpcomingAlgo {
  difficulty: Difficulty;
  costMs: number;
}

export interface LearnedToday {
  ts: number;
  difficulty: Difficulty;
}

const MINUTE = 60_000;

export function algoCostMs(difficulty: Difficulty, learnMinutes: number, factors: DifficultyFactors): number {
  return Math.round(learnMinutes * (factors[difficulty] ?? 1) * MINUTE);
}

/** Timestamp of `hour`:00 on the local day of `now`. */
export function atHour(now: number, hour: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour).getTime();
}

/** Time reserved for the next `left` algorithms (in suggestion order). */
export function reserveMs(left: number, upcoming: readonly UpcomingAlgo[]): number {
  return upcoming.slice(0, Math.max(0, left)).reduce((sum, a) => sum + a.costMs, 0);
}

/** Free time until the deadline after reserving learning time; negative when the goal is already at risk. */
export function slackMs(now: number, deadline: number, reserve: number): number {
  return deadline - now - reserve;
}

/**
 * Entertainment time granted by today's learn events (oldest first, with their learning cost). The k-th event shares
 * the slack at that moment between itself and each algorithm still to learn: clamp(slack / (left + 1), 0, maxGrant).
 * What was ahead at an earlier event = the algorithms actually learned after it plus the start of the current
 * suggestion list. Events that meet the goal grant nothing (everything unlocks anyway).
 */
export function grantedMs(
  learned: readonly { ts: number; costMs: number }[],
  goal: number,
  deadline: number,
  upcoming: readonly UpcomingAlgo[],
  maxGrantMs: number,
): number {
  let total = 0;
  learned.forEach((event, i) => {
    const left = goal - (i + 1);
    if (left <= 0) return;
    const later = learned.slice(i + 1, i + 1 + left);
    const reserve = later.reduce((sum, l) => sum + l.costMs, 0) + reserveMs(left - later.length, upcoming);
    const slack = slackMs(event.ts, deadline, reserve);
    total += Math.min(maxGrantMs, Math.max(0, slack / (left + 1)));
  });
  return Math.floor(total);
}

/** Spendable entertainment time right now; null = unlimited (goal met). */
export function availableMs(
  now: number,
  learned: number,
  goal: number,
  granted: number,
  used: number,
  deadline: number,
  reserve: number,
): number | null {
  if (learned >= goal) return null;
  return Math.max(0, Math.min(granted - used, slackMs(now, deadline, reserve)));
}

export type TimelineSegment =
  | { kind: 'past'; start: number; end: number }
  | { kind: 'fun' | 'free' | 'unlimited'; start: number; end: number }
  | { kind: 'algo'; start: number; end: number; difficulty: Difficulty };

export interface DayTimeline {
  start: number;
  end: number;
  /** "Now" clamped to the window. */
  now: number;
  segments: TimelineSegment[];
  /** Today's learn events inside the window, as ticks on the past part. */
  ticks: LearnedToday[];
  /** Latest moment to start learning and still finish by the deadline; null when the goal is met. */
  latestStart: number | null;
  /** How much learning time doesn't fit before the deadline (0 when it fits). */
  shortageMs: number;
  /** The deadline has passed and the goal isn't met. */
  ended: boolean;
}

/**
 * Lays out the learning day: the past, then (as a "latest safe" schedule) the entertainment available now, free
 * slack, and the remaining algorithms packed against the deadline. If they don't fit, they're squeezed into the
 * time left and `shortageMs` says by how much.
 */
export function dayTimeline(input: {
  now: number;
  start: number;
  end: number;
  learned: readonly LearnedToday[];
  goal: number;
  upcoming: readonly UpcomingAlgo[];
  available: number | null;
}): DayTimeline {
  const { start, end, goal, upcoming, available } = input;
  const now = Math.min(end, Math.max(start, input.now));
  const left = goal - input.learned.length;
  const segments: TimelineSegment[] = [];
  if (now > start) segments.push({ kind: 'past', start, end: now });
  const ticks = input.learned.filter((l) => l.ts >= start && l.ts <= end);

  if (left <= 0) {
    if (now < end) segments.push({ kind: 'unlimited', start: now, end });
    return { start, end, now, segments, ticks, latestStart: null, shortageMs: 0, ended: false };
  }

  const ahead = upcoming.slice(0, left);
  const reserve = reserveMs(left, upcoming);
  const remaining = Math.max(0, end - now);
  const ended = input.now >= end;
  const shortageMs = ended ? 0 : Math.max(0, reserve - remaining);
  const latestStart = end - reserve;

  if (!ended) {
    // Squeeze the blocks proportionally when they don't fit.
    const scale = reserve > remaining && reserve > 0 ? remaining / reserve : 1;
    const blocksStart = end - reserve * scale;
    const fun = Math.min(available ?? 0, blocksStart - now);
    if (fun > 0) segments.push({ kind: 'fun', start: now, end: now + fun });
    if (blocksStart > now + Math.max(0, fun))
      segments.push({ kind: 'free', start: now + Math.max(0, fun), end: blocksStart });
    let t = blocksStart;
    for (const a of ahead) {
      const w = a.costMs * scale;
      segments.push({ kind: 'algo', start: t, end: t + w, difficulty: a.difficulty });
      t += w;
    }
  }

  return { start, end, now, segments, ticks, latestStart, shortageMs, ended };
}
