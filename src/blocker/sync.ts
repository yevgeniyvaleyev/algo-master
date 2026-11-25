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
    // The single goal as the native fields: new algorithms still planned on top of those learned, and the reviews.
    dailyGoal: b.learned.length + b.day.algos,
    goalTomorrow: b.tomorrow.algos,
    learnedToday: b.learned.length,
    grantedMs: b.granted,
    deadlineMs: b.deadline,
    reserveMs: b.reserve,
    day: dayKey(new Date(b.now)),
    dayStartHour: s.dayStartHour,
    cardsLeft: b.day.cards,
    cardGoal: b.tomorrow.cards,
    cardsReviewed: b.day.reviewed,
  });
}
