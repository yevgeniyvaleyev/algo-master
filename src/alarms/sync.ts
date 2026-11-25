import { StudyAlarms } from '@modules/study-alarms';

import { displayTitle } from '@/content/format';
import { dayKey } from '@/logic/dates';
import { loadDayBudget } from '@/logic/day-budget';
import { dueByBox, dueCount } from '@/logic/leitner';
import { alarmWaveform, vibrationFor } from '@/logic/vibration';
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
  const vibration = vibrationFor(s.alarmVibration, 'alarm');
  const waveform = alarmWaveform(vibration.pattern ?? [], s.alarmVibrationRepeat, s.alarmVibrationTimes);
  const due = dueByBox(b.deck, s.cardBoxOneSize);
  StudyAlarms.setConfig({
    enabled: s.alarmsEnabled,
    cardsEnabled: s.cardAlarmsEnabled,
    snoozeMinutes: s.alarmSnoozeMinutes,
    startHour: s.reminderStartHour,
    endHour: s.reminderEndHour,
    // The single goal as the native fields: new algorithms still planned on top of those learned, and the reviews.
    goal: b.learned.length + b.day.algos,
    goalTomorrow: b.tomorrow.algos,
    learnedToday: b.learned.length,
    day: dayKey(new Date(b.now)),
    dayStartHour: s.dayStartHour,
    upcoming: b.next.map((a, i) => ({
      slug: a.slug,
      title: displayTitle(a),
      difficulty: a.difficulty,
      costMs: b.upcoming[i].costMs,
    })),
    cardsLeft: b.day.cards,
    cardGoal: b.tomorrow.cards,
    cardCostMs: b.cardCostMs,
    cardDailyGoal: b.day.goal,
    cardsReviewedToday: b.day.done,
    cardsDue: dueCount(b.deck, s.cardBoxOneSize),
    // Box 1 with the waiting cards that refill it today.
    cardsDueByBox: due.boxes.map((n, i) => (i === 0 ? n + due.waiting : n)),
    vibrationKey: vibration.key,
    vibration: waveform.timings,
    vibrationRepeat: waveform.repeat,
    sound: s.alarmSound,
  });
}
