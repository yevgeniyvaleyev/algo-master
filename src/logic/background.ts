import { syncAlarms } from '@/alarms/sync';
import { syncBlocker } from '@/blocker/sync';
import { syncReminders } from '@/notifications/reminders';

/** Settings that affect reminders, alarms or blocking (the learning day doubles as the reminder window); changing any re-syncs all. */
export const BACKGROUND_SETTING_KEYS = [
  'dayStartHour',
  'remindersEnabled',
  'reminderStartHour',
  'reminderEndHour',
  'reminderIntervalHours',
  'dailyGoal',
  'minutesPerAlgo',
  'learnMinutes',
  'difficultyFactors',
  'blockedPackages',
  'alarmsEnabled',
  'cardDailyGoal',
  'cardAheadCount',
  'cardMinutes',
  'cardBoxOneSize',
] as const;

/** Brings reminders, study alarms and the native app blocker in line with the current progress and settings. */
export async function syncBackground(): Promise<void> {
  await Promise.all([
    syncReminders(),
    syncBlocker().catch((e) => console.warn('syncBlocker failed', e)),
    syncAlarms().catch((e) => console.warn('syncAlarms failed', e)),
  ]);
}
