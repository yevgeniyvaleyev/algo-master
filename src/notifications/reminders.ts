import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { loadDayBudget } from '@/logic/day-budget';
import { planReminders, reminderContent } from '@/logic/reminders';
import { channelId, vibrationFor } from '@/logic/vibration';
import { useSettings } from '@/store/settings';

type NotificationsModule = typeof import('expo-notifications');

/**
 * expo-notifications is only partly supported in Expo Go on Android (creating a channel throws), so reminders
 * only work in a development or release build. In Expo Go the module is never loaded and every function
 * below is a no-op. (Since SDK 58 `executionEnvironment` doesn't single out Expo Go, so ask `expo` directly.)
 */
export const remindersSupported = !isRunningInExpoGo();

// eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load in Expo Go
const Notifications: NotificationsModule | null = remindersSupported ? require('expo-notifications') : null;

const CHANNEL_PREFIX = 'reminders';
/** Days planned ahead, so reminders keep coming even if the app isn't opened for a while. */
const DAYS_AHEAD = 7;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Creates the reminder channel for the chosen vibration and returns its id. A channel's vibration can't change after
 * it is created, so each type has its own channel (`channelId`); the other types' channels are deleted, leaving one
 * «Напоминания» in the system settings.
 */
async function ensureChannel(): Promise<string> {
  const vibration = vibrationFor(useSettings.getState().reminderVibration, 'reminder');
  const id = channelId(CHANNEL_PREFIX, vibration.key);
  if (!Notifications || Platform.OS !== 'android') return id;
  const channels = await Notifications.getNotificationChannelsAsync();
  for (const c of channels) {
    if (c.id !== id && (c.id === CHANNEL_PREFIX || c.id.startsWith(`${CHANNEL_PREFIX}-`)))
      await Notifications.deleteNotificationChannelAsync(c.id);
  }
  await Notifications.setNotificationChannelAsync(id, {
    name: 'Напоминания',
    description: 'Напоминания о дневной цели',
    importance: Notifications.AndroidImportance.DEFAULT,
    ...(vibration.pattern == null
      ? {}
      : {
          enableVibrate: vibration.pattern.length > 0,
          vibrationPattern: vibration.pattern.length > 0 ? vibration.pattern : null,
        }),
  });
  return id;
}

/** Creates the Android channel and asks for permission (Android 13+ shows a system prompt). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function reschedule(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const s = useSettings.getState();
  if (!s.remindersEnabled) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const channel = await ensureChannel();

  const now = new Date();
  const b = await loadDayBudget(now.getTime());
  const plan = planReminders(
    { startHour: s.reminderStartHour, endHour: s.reminderEndHour, intervalHours: s.reminderIntervalHours },
    { goal: b.day.goal, done: b.day.done, cards: b.day.cards, algos: b.day.algos },
    now,
    DAYS_AHEAD,
    s.dailyGoal + (b.credit?.part.dueTomorrow ?? 0),
    s.dailyGoal,
  );
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      content: reminderContent(r),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: channel },
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/**
 * Replaces all scheduled reminders with a fresh plan. Calls are serialized so overlapping triggers
 * (foreground + mark + settings change) can't interleave cancel/schedule.
 */
export function syncReminders(): Promise<void> {
  queue = queue.then(reschedule).catch((e) => console.warn('syncReminders failed', e));
  return queue;
}
