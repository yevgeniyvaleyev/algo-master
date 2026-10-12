import { AppBlocker } from '@modules/app-blocker';

import { dayKey } from '@/logic/dates';
import { loadDayBudget } from '@/logic/day-budget';
import { useSettings } from '@/store/settings';

/** Pushes today's adaptive budget and the app selection to the native blocker (no-op in Expo Go). */
export async function syncBlocker(): Promise<void> {
  if (!AppBlocker) return;
  const s = useSettings.getState();
  const b = await loadDayBudget();
  AppBlocker.setConfig({
    enabled: s.blockedPackages.length > 0,
    blockedPackages: s.blockedPackages,
    dailyGoal: b.goal,
    learnedToday: b.learned.length,
    grantedMs: b.granted,
    deadlineMs: b.deadline,
    reserveMs: b.reserve,
    day: dayKey(new Date(b.now)),
  });
}
