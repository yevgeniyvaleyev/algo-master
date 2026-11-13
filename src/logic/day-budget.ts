import { displayTitle } from '@/content/format';
import type { Difficulty } from '@/content/types';
import { getCardDayStats, getCardDeck, getNextUnlearned, getTodayLearned, type AlgoRow } from '@/db/repo';
import { useSettings } from '@/store/settings';

import { algoCostMs, atHour, grantedMs, reserveMs, type LearnedToday, type UpcomingAlgo } from './budget';
import { cardDay, planItems, type CardDay, type DayItem } from './card-day';
import type { DeckCard } from './leitner';

/**
 * Today's flash-card minimum from the deck and today's answers; also returns the deck it was computed from. Recomputed
 * on every load: until the goal is reached, cards that become pending later (e.g. a newly learned algorithm) are asked
 * for again.
 */
export async function loadCardDay(now: number = Date.now()): Promise<{ cards: CardDay; deck: DeckCard[] }> {
  const s = useSettings.getState();
  const today = new Date(now);
  const [deck, stats] = await Promise.all([getCardDeck(), getCardDayStats(today)]);
  const cards = cardDay({
    deck,
    reviewed: stats.reviewed,
    aheadReviewed: stats.aheadReviewed,
    goal: s.cardDailyGoal,
    ahead: s.cardAheadCount,
    capacity: s.cardBoxOneSize,
    today,
  });
  return { cards, deck };
}

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
  /** Today's flash-card minimum. */
  cards: CardDay;
  /** Cards the native side should plan/require for the next day until JS syncs again (bounded by the deck). */
  cardGoalTomorrow: number;
  cardCostMs: number;
  /** What's still to do today: the remaining algorithms with the remaining cards in groups between them. */
  items: DayItem[];
  /** Algorithm goal and card minimum both met: nothing is blocked. */
  goalMet: boolean;
  granted: number;
  /** Learning time reserved for the rest of today's goal and cards. */
  reserve: number;
}

export async function loadDayBudget(now: number = Date.now()): Promise<DayBudget> {
  const s = useSettings.getState();
  const goal = s.dailyGoal;
  const [learned, next, { cards, deck }] = await Promise.all([
    getTodayLearned(new Date(now)),
    getNextUnlearned(Math.max(goal, 3)),
    loadCardDay(now),
  ]);
  const cost = (d: Difficulty) => algoCostMs(d, s.learnMinutes, s.difficultyFactors);
  const upcoming = next.map((a) => ({ difficulty: a.difficulty, costMs: cost(a.difficulty), title: displayTitle(a) }));
  const left = Math.max(0, goal - learned.length);
  const cardCostMs = s.cardMinutes * 60_000;
  const cardReserve = cards.left * cardCostMs;
  const deadline = atHour(now, s.reminderEndHour);
  return {
    now,
    start: atHour(now, s.reminderStartHour),
    deadline,
    goal,
    learned,
    next,
    upcoming,
    cards,
    cardGoalTomorrow: Math.min(s.cardDailyGoal, deck.length),
    cardCostMs,
    items: planItems(upcoming.slice(0, left), cards.left, cardCostMs),
    goalMet: left === 0 && cards.left === 0,
    granted: grantedMs(
      learned.map((l) => ({ ts: l.ts, costMs: cost(l.difficulty) })),
      goal,
      deadline,
      upcoming,
      s.minutesPerAlgo * 60_000,
      cardReserve,
    ),
    reserve: reserveMs(left, upcoming) + cardReserve,
  };
}
