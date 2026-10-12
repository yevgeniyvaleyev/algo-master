import { syncBlocker } from '@/blocker/sync';
import { syncReminders } from '@/notifications/reminders';

/** Settings that affect reminders or blocking; changing any of them re-syncs both. */
export const BACKGROUND_SETTING_KEYS = [
  'remindersEnabled',
  'reminderStartHour',
  'reminderEndHour',
  'reminderIntervalHours',
  'dailyGoal',
  'minutesPerAlgo',
  'blockedPackages',
] as const;

/** Brings reminders and the native app blocker in line with the current progress and settings. */
export async function syncBackground(): Promise<void> {
  await Promise.all([syncReminders(), syncBlocker().catch((e) => console.warn('syncBlocker failed', e))]);
}
