import { displayTitle } from '@/content/format';
import type { Difficulty } from '@/content/types';
import {
  getCardDayStats,
  getCardDeck,
  getCountsSince,
  getNextUnlearned,
  getTodayLearned,
  getUnlearnedCount,
  listCredits,
  type AlgoRow,
} from '@/db/repo';
import { useSettings } from '@/store/settings';

import { algoCostMs, atHour, grantedMs, type LearnedToday, type UpcomingAlgo } from './budget';
import { planItems, splitTomorrow, studyDay, type DayItem, type StudyDay } from './card-day';
import { creditState, type Credit, type CreditState } from './credit';
import { dayKey } from './dates';
import type { DeckCard } from './leitner';

/** The latest credit («Взять в долг») as of now, or null; every credit for the streak and the history. */
export async function loadCredit(now: number = Date.now()): Promise<{ credit: CreditState | null; credits: Credit[] }> {
  const s = useSettings.getState();
  const credits = await listCredits();
  const last = credits.at(-1) ?? null;
  if (!last) return { credit: null, credits };
  const done = await getCountsSince(last.day);
  const credit = creditState({ credit: last, goal: s.dailyGoal, done, today: dayKey(new Date(now)) });
  return { credit, credits };
}

/**
 * Today's single goal from the deck, today's ✓ answers and learned algorithms (`studyDay`); also returns what it was
 * computed from. Recomputed on every load.
 */
export async function loadStudyDay(
  now: number = Date.now(),
  credit?: CreditState | null,
): Promise<{
  day: StudyDay;
  deck: DeckCard[];
  credit: CreditState | null;
  reviewedToday: { slug: string; ts: number }[];
  learnedToday: (LearnedToday & { slug: string })[];
  unlearned: number;
}> {
  const s = useSettings.getState();
  const today = new Date(now);
  const [deck, reviewedToday, learnedToday, unlearned, loaded] = await Promise.all([
    getCardDeck(),
    getCardDayStats(today),
    getTodayLearned(today),
    getUnlearnedCount(),
    credit === undefined ? loadCredit(now).then((c) => c.credit) : Promise.resolve(credit),
  ]);
  const day = studyDay({
    deck,
    reviewed: reviewedToday.map((r) => r.slug),
    learned: learnedToday.map((l) => l.slug),
    goal: loaded ? loaded.part.todayGoal : s.dailyGoal,
    capacity: s.cardBoxOneSize,
    unlearned,
    today,
  });
  return { day, deck, credit: loaded, reviewedToday, learnedToday, unlearned };
}

/** Everything the adaptive budget needs for today, loaded from the DB and settings. */
export interface DayBudget {
  now: number;
  start: number;
  deadline: number;
  /** Today's goal and what is left of it (reviews first, then new algorithms). */
  day: StudyDay;
  /** The latest credit, or null. */
  credit: CreditState | null;
  /** Algorithms learned today (first time each), oldest first. */
  learned: LearnedToday[];
  /** Next unlearned algorithms in suggestion order (today's and tomorrow's new ones, at least 3). */
  next: AlgoRow[];
  upcoming: UpcomingAlgo[];
  /** Learned algorithms with their Leitner state. */
  deck: DeckCard[];
  /** Tomorrow's split if nothing more is done today (native fallback when a new day starts before the next sync). */
  tomorrow: { cards: number; algos: number };
  cardCostMs: number;
  /** What's still to do today: the new algorithms with the reviews in groups between them. */
  items: DayItem[];
  /** The goal is met (or nothing is left to do): nothing is blocked. */
  goalMet: boolean;
  granted: number;
  /** Learning time reserved for the rest of today's goal. */
  reserve: number;
}

export async function loadDayBudget(now: number = Date.now()): Promise<DayBudget> {
  const s = useSettings.getState();
  const { credit } = await loadCredit(now);
  const { day, deck, reviewedToday, learnedToday, unlearned } = await loadStudyDay(now, credit);
  const tomorrow = splitTomorrow({
    deck,
    goal: s.dailyGoal + (credit?.part.dueTomorrow ?? 0),
    capacity: s.cardBoxOneSize,
    unlearned: unlearned - day.algos,
    today: new Date(now),
  });
  const next = await getNextUnlearned(Math.max(day.algos + tomorrow.algos, 3));
  const cost = (d: Difficulty) => algoCostMs(d, s.learnMinutes, s.difficultyFactors);
  const upcoming = next.map((a) => ({ difficulty: a.difficulty, costMs: cost(a.difficulty), title: displayTitle(a) }));
  const cardCostMs = s.cardMinutes * 60_000;
  const items = planItems(upcoming.slice(0, day.algos), day.cards, cardCostMs);
  const deadline = atHour(now, s.reminderEndHour);
  // Every success today earns time: learned algorithms at their cost, cards answered ✓ at the card cost.
  const events = [
    ...learnedToday.map((l) => ({ ts: l.ts, costMs: cost(l.difficulty) })),
    ...reviewedToday
      .filter((r) => !learnedToday.some((l) => l.slug === r.slug))
      .map((r) => ({ ts: r.ts, costMs: cardCostMs })),
  ].sort((a, b) => a.ts - b.ts);
  return {
    now,
    start: atHour(now, s.reminderStartHour),
    deadline,
    day,
    credit,
    learned: learnedToday,
    next,
    upcoming,
    deck,
    tomorrow,
    cardCostMs,
    items,
    goalMet: day.left === 0,
    granted: grantedMs(
      events,
      events.length + items.length,
      deadline,
      items.map((i) => ({ difficulty: 'easy' as const, costMs: i.costMs })),
      s.minutesPerAlgo * 60_000,
      0,
      s.learnMinutes * 60_000,
    ),
    reserve: items.reduce((sum, i) => sum + i.costMs, 0),
  };
}
