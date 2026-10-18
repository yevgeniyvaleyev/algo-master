/**
 * Even study plan for the rest of the learning day: the time from max(now, start) to the deadline is split into one
 * interval per remaining algorithm, and each algorithm's learning time is centred in its interval. An alarm rings at
 * the start of the next block. Mirrored in Kotlin by modules/study-alarms/.../StudyPlan.kt — keep them in sync.
 */

export interface PlanItem {
  costMs: number;
}

export interface PlannedBlock {
  start: number;
  end: number;
}

/** Alarms never ring sooner than this after "now" (just finished or dismissed an algorithm). */
export const MIN_ALARM_GAP_MS = 10 * 60_000;

export function planDay(input: {
  now: number;
  start: number;
  deadline: number;
  items: readonly PlanItem[];
}): PlannedBlock[] {
  const { deadline, items } = input;
  const from = Math.max(input.now, input.start);
  if (items.length === 0 || from >= deadline) return [];
  const span = deadline - from;
  const total = items.reduce((sum, i) => sum + i.costMs, 0);

  // Doesn't fit at all: back to back from now (the timeline reports the shortage).
  if (total > span) {
    let t = from;
    return items.map((i) => ({ start: t, end: (t += i.costMs) }));
  }

  // Equal intervals when every block fits its interval, otherwise intervals proportional to cost.
  const equal = span / items.length;
  const proportional = items.some((i) => i.costMs > equal);
  let t = from;
  return items.map((i) => {
    const width = proportional && total > 0 ? (span * i.costMs) / total : equal;
    const mid = t + width / 2;
    t += width;
    return { start: mid - i.costMs / 2, end: mid + i.costMs / 2 };
  });
}

/** When the next alarm should ring for this plan; null when nothing is planned. */
export function nextAlarmAt(plan: readonly PlannedBlock[], now: number): number | null {
  if (plan.length === 0) return null;
  return Math.max(plan[0].start, now + MIN_ALARM_GAP_MS);
}
