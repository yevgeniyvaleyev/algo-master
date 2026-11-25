import type { Difficulty } from '@/content/types';

/**
 * Texts of the full-screen study alarm (pure, tested). Mirrors AlarmNotification.texts and AlarmActivity in
 * modules/study-alarms (keep them in sync); used by the dev preview (`/alarm-preview`), which works in Expo Go.
 */

export type AlarmBlock =
  | { kind: 'algo'; title: string; difficulty: Difficulty; costMs: number }
  | { kind: 'cards'; count: number; costMs: number };

export interface AlarmDayState {
  learnedToday: number;
  goal: number;
  /** Cards still to review today. */
  cardsLeft: number;
  cardDailyGoal: number;
  cardsReviewedToday: number;
  cardsDue: number;
  /** Due cards per box 1–5 (box 1 with its refills). */
  cardsDueByBox: number[];
  /** «21:00», the end of the learning day. */
  deadline: string;
}

export interface AlarmScreen {
  heading: string;
  title: string;
  detail: string;
  /** Status lines under the detail, the first one more prominent for cards. */
  lines: string[];
}

const DIFFICULTY: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function alarmScreen(block: AlarmBlock, day: AlarmDayState): AlarmScreen {
  const minutes = Math.floor(block.costMs / 60_000);
  if (block.kind === 'cards') {
    const goal = day.cardDailyGoal > 0 ? ` из ${day.cardDailyGoal}` : '';
    const boxes = day.cardsDueByBox.map((n, i) => ({ n, box: i + 1 })).filter((b) => b.n > 0);
    return {
      heading: '⏰ Время повторить карточки',
      title: `Карточки: ${block.count}`,
      detail: `~${minutes} мин.`,
      lines: [
        `Повторено сегодня ${day.cardsReviewedToday}${goal} · к повтору ${day.cardsDue}`,
        ...(boxes.length > 0 ? [`По коробкам: ${boxes.map((b) => `${b.box} — ${b.n}`).join(' · ')}`] : []),
        `Изучено алгоритмов ${day.learnedToday} из ${day.goal} · учебный день до ${day.deadline}`,
      ],
    };
  }
  return {
    heading: '⏰ Время учить',
    title: block.title,
    detail: `${DIFFICULTY[block.difficulty]} · ~${minutes} мин.`,
    lines: [
      `Изучено сегодня ${day.learnedToday} из ${day.goal}` +
        (day.cardsLeft > 0 ? ` · карточек осталось ${day.cardsLeft}` : '') +
        ` · учебный день до ${day.deadline}`,
    ],
  };
}
