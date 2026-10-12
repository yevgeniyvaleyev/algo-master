import { AppBlocker } from '@modules/app-blocker';

import { getTodayCount } from '@/db/repo';
import { dayKey } from '@/logic/dates';
import { useSettings } from '@/store/settings';

/** Pushes the current goal/progress/selection to the native blocker (no-op in Expo Go). */
export async function syncBlocker(): Promise<void> {
  if (!AppBlocker) return;
  const s = useSettings.getState();
  const now = new Date();
  AppBlocker.setConfig({
    enabled: s.blockedPackages.length > 0,
    blockedPackages: s.blockedPackages,
    dailyGoal: s.dailyGoal,
    learnedToday: await getTodayCount(now),
    minutesPerAlgo: s.minutesPerAlgo,
    day: dayKey(now),
  });
}
