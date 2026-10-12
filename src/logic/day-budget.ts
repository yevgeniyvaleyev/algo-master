import type { Difficulty } from '@/content/types';
import { getNextUnlearned, getTodayLearned, type AlgoRow } from '@/db/repo';
import { useSettings } from '@/store/settings';

import { algoCostMs, atHour, grantedMs, reserveMs, type LearnedToday, type UpcomingAlgo } from './budget';

/** Everything the adaptive budget needs for today, loaded from the DB and settings. */
export interface DayBudget {
  now: number;
  start: number;
  deadline: number;
  goal: number;
  learned: LearnedToday[];
  /** Next unlearned algorithms in suggestion order (at least the remaining goal, at least 3). */
  next: AlgoRow[];
  upcoming: UpcomingAlgo[];
  granted: number;
  /** Learning time reserved for the rest of today's goal. */
  reserve: number;
}

export async function loadDayBudget(now: number = Date.now()): Promise<DayBudget> {
  const s = useSettings.getState();
  const goal = s.dailyGoal;
  const [learned, next] = await Promise.all([getTodayLearned(new Date(now)), getNextUnlearned(Math.max(goal, 3))]);
  const cost = (d: Difficulty) => algoCostMs(d, s.learnMinutes, s.difficultyFactors);
  const upcoming = next.map((a) => ({ difficulty: a.difficulty, costMs: cost(a.difficulty) }));
  const deadline = atHour(now, s.reminderEndHour);
  return {
    now,
    start: atHour(now, s.reminderStartHour),
    deadline,
    goal,
    learned,
    next,
    upcoming,
    granted: grantedMs(
      learned.map((l) => ({ ts: l.ts, costMs: cost(l.difficulty) })),
      goal,
      deadline,
      upcoming,
      s.minutesPerAlgo * 60_000,
    ),
    reserve: reserveMs(goal - learned.length, upcoming),
  };
}
