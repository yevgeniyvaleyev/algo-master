/**
 * Vibration types for reminders and study alarms (pure, tested). A pattern alternates wait / vibrate in ms, starting
 * with a wait (Android's format). Android can't change a notification channel's vibration after creating it, so each
 * type gets its own channel id (`channelId`); `system` keeps the plain id and the channel's default vibration.
 */

export type VibrationKey = 'system' | 'off' | 'short' | 'double' | 'standard' | 'long' | 'heartbeat' | 'sos';

export interface Vibration {
  key: VibrationKey;
  label: string;
  /** null = the system default (only for reminders). */
  pattern: number[] | null;
}

const DOT = 150;
const DASH = 450;
const GAP = 100;
const letter = (on: number) => [on, GAP, on, GAP, on];

export const VIBRATIONS: readonly Vibration[] = [
  { key: 'system', label: 'Как в системе', pattern: null },
  { key: 'off', label: 'Без вибрации', pattern: [] },
  { key: 'short', label: 'Короткая', pattern: [0, 250] },
  { key: 'double', label: 'Двойная', pattern: [0, 200, 150, 200] },
  { key: 'standard', label: 'Стандартная', pattern: [0, 800, 400, 800, 400] },
  { key: 'long', label: 'Длинная', pattern: [0, 1500, 500, 1500] },
  { key: 'heartbeat', label: 'Сердцебиение', pattern: [0, 120, 100, 300, 700, 120, 100, 300] },
  { key: 'sos', label: 'SOS', pattern: [0, ...letter(DOT), 300, ...letter(DASH), 300, ...letter(DOT)] },
];

export const DEFAULT_REMINDER_VIBRATION: VibrationKey = 'system';
export const DEFAULT_ALARM_VIBRATION: VibrationKey = 'standard';

/** Choices for a kind of alert; alarms always set their own pattern, so they have no «Как в системе». */
export function vibrationOptions(kind: 'reminder' | 'alarm'): readonly Vibration[] {
  return kind === 'alarm' ? VIBRATIONS.filter((v) => v.key !== 'system') : VIBRATIONS;
}

/** The vibration for a stored key; unknown keys (or `system` for alarms) fall back to the kind's default. */
export function vibrationFor(key: string, kind: 'reminder' | 'alarm'): Vibration {
  const options = vibrationOptions(kind);
  const fallback = kind === 'alarm' ? DEFAULT_ALARM_VIBRATION : DEFAULT_REMINDER_VIBRATION;
  return options.find((v) => v.key === key) ?? options.find((v) => v.key === fallback)!;
}

/** Channel id for a vibration type: `reminders` for the system default, else `reminders-double` etc. */
export function channelId(prefix: string, key: VibrationKey): string {
  return key === 'system' ? prefix : `${prefix}-${key}`;
}

/**
 * How often a study alarm's vibration repeats while it rings (the ring itself stops after a minute or when answered):
 * once, `times` times, without stopping, or without stopping with a REPEAT_PAUSE_MS pause between repeats.
 */
export type VibrationRepeat = 'once' | 'times' | 'loop' | 'loopPause';

export const VIBRATION_REPEATS: readonly { key: VibrationRepeat; label: string }[] = [
  { key: 'once', label: 'Один раз' },
  { key: 'times', label: 'Несколько раз' },
  { key: 'loop', label: 'Без остановки' },
  { key: 'loopPause', label: 'Без остановки, пауза 5 с' },
];

export const DEFAULT_VIBRATION_REPEAT: VibrationRepeat = 'loop';
export const REPEAT_PAUSE_MS = 5_000;
/** Gap before the next repeat when a pattern ends while vibrating (so repeats stay distinguishable). */
const REPEAT_GAP_MS = 300;
export const MIN_VIBRATION_TIMES = 2;
export const MAX_VIBRATION_TIMES = 10;

export function vibrationRepeatLabel(key: string): string {
  return (VIBRATION_REPEATS.find((r) => r.key === key) ?? VIBRATION_REPEATS[2]).label;
}

/**
 * The waveform the alarm vibrates (Android `VibrationEffect.createWaveform(timings, repeat)`): `repeat` is the index
 * to loop from, -1 for no loop. One cycle is the pattern followed by a wait (REPEAT_GAP_MS, or REPEAT_PAUSE_MS for
 * `loopPause`); `times` plays that cycle `times` times. Every cycle has odd length (it ends with a wait), so looping
 * back to index 0 keeps the wait / vibrate positions.
 */
export function alarmWaveform(
  pattern: readonly number[],
  repeat: VibrationRepeat,
  times: number,
): { timings: number[]; repeat: number } {
  if (pattern.length === 0) return { timings: [], repeat: -1 };
  if (repeat === 'once') return { timings: [...pattern], repeat: -1 };
  const gap = repeat === 'loopPause' ? REPEAT_PAUSE_MS : REPEAT_GAP_MS;
  // Odd length = ends with a wait (timings alternate wait, vibrate, …); stretch it to the gap, else add one.
  const cycle =
    pattern.length % 2 === 1
      ? [...pattern.slice(0, -1), Math.max(pattern[pattern.length - 1], gap)]
      : [...pattern, gap];
  if (repeat === 'times') {
    // Positions alternate wait / vibrate, so the cycles are joined after their leading wait (an odd-length cycle
    // appended whole would swap waits and vibrations from the second cycle on).
    const n = Math.min(MAX_VIBRATION_TIMES, Math.max(MIN_VIBRATION_TIMES, Math.round(times)));
    const body = cycle.slice(1);
    return { timings: [cycle[0], ...Array.from({ length: n }, () => body).flat()], repeat: -1 };
  }
  return { timings: cycle, repeat: 0 };
}
