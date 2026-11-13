import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { getTodayCount } from '@/db/repo';
import { cardsWord } from '@/logic/card-gate';
import { loadCardDay } from '@/logic/day-budget';
import { planReminders } from '@/logic/reminders';
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

const CHANNEL_ID = 'reminders';
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

const algosWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'алгоритм';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'алгоритма';
  return 'алгоритмов';
};

/** Creates the Android channel and asks for permission (Android 13+ shows a system prompt). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Напоминания',
      description: 'Напоминания о дневной цели',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
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

  const now = new Date();
  const [learnedToday, { cards }] = await Promise.all([getTodayCount(now), loadCardDay(now.getTime())]);
  const plan = planReminders(
    { startHour: s.reminderStartHour, endHour: s.reminderEndHour, intervalHours: s.reminderIntervalHours },
    s.dailyGoal,
    learnedToday,
    now,
    DAYS_AHEAD,
    cards.left,
  );
  const cardsText = (n: number) => (n > 0 ? ` Повтори ещё ${n} ${cardsWord(n)}.` : '');
  for (const r of plan) {
    const algosDone = r.isToday && r.remaining <= 0;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: algosDone ? 'Карточки на сегодня не повторены' : 'Дневная цель не выполнена',
        body: algosDone
          ? `Алгоритмы на сегодня изучены.${cardsText(r.cardsLeft)}`
          : r.isToday
            ? `Изучено ${s.dailyGoal - r.remaining} из ${s.dailyGoal}. Осталось ${r.remaining} ${algosWord(r.remaining)}.` +
              cardsText(r.cardsLeft)
            : `Цель на сегодня — ${s.dailyGoal} ${algosWord(s.dailyGoal)}. Пора начинать!`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL_ID },
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
