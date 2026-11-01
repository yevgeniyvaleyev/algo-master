import { StudyAlarms } from '@modules/study-alarms';

import { displayTitle } from '@/content/format';
import { dayKey } from '@/logic/dates';
import { loadDayBudget } from '@/logic/day-budget';
import { useSettings } from '@/store/settings';

/**
 * Pushes the study-plan inputs to the native alarm scheduler (no-op in Expo Go). The native side plans the even
 * schedule itself (StudyPlan.kt mirrors src/logic/study-plan.ts) so it can re-plan after an alarm, a reboot or at
 * the start of a new day without the app running.
 */
export async function syncAlarms(): Promise<void> {
  if (!StudyAlarms) return;
  const s = useSettings.getState();
  const b = await loadDayBudget();
  StudyAlarms.setConfig({
    enabled: s.alarmsEnabled,
    startHour: s.reminderStartHour,
    endHour: s.reminderEndHour,
    goal: b.goal,
    learnedToday: b.learned.length,
    day: dayKey(new Date(b.now)),
    dayStartHour: s.dayStartHour,
    upcoming: b.next.map((a, i) => ({
      slug: a.slug,
      title: displayTitle(a),
      difficulty: a.difficulty,
      costMs: b.upcoming[i].costMs,
    })),
  });
}
