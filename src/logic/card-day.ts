import type { Difficulty } from '@/content/types';

import { addDays } from './dates';
import { pendingSlugs, type DeckCard } from './leitner';

/**
 * The day's single goal («Цель в день»): successful cards. Each distinct card answered ✓ today counts once (also after
 * an ✗, also in the card gate), and so does each algorithm learned today. What is still to do is taken in priority
 * order: the reviews pending today (due boxes 2–5, the box-1 rotation and the «ждут» cards refilling it), and only once
 * those run out, new algorithms from «не изучены». Recomputed on every load; running out of everything counts as done.
 */
export interface StudyDay {
  /** The goal for today (the setting, changed by a credit). */
  goal: number;
  /** Successes today: `reviewed + learned` (distinct). */
  done: number;
  /** Distinct cards answered ✓ today. */
  reviewed: number;
  /** Distinct algorithms learned today. */
  learned: number;
  /** Still to do today: `cards + algos` (less than goal − done when there is nothing more to take). */
  left: number;
  /** Reviews still to do (pending today, not yet answered ✓). */
  cards: number;
  /** New algorithms still to learn, after the reviews. */
  algos: number;
}

export function studyDay(input: {
  deck: readonly DeckCard[];
  /** Distinct slugs answered ✓ today. */
  reviewed: readonly string[];
  /** Distinct slugs learned today. */
  learned: readonly string[];
  goal: number;
  capacity: number;
  /** Algorithms in «не изучены». */
  unlearned: number;
  today?: Date;
}): StudyDay {
  const { deck, goal, today = new Date() } = input;
  const reviewed = new Set(input.reviewed);
  const done = new Set([...input.reviewed, ...input.learned]).size;
  const want = Math.max(0, goal - done);
  const open = pendingSlugs(deck, input.capacity, today).filter((s) => !reviewed.has(s)).length;
  const cards = Math.min(want, open);
  const algos = Math.min(want - cards, Math.max(0, input.unlearned));
  return {
    goal,
    done,
    reviewed: reviewed.size,
    learned: new Set(input.learned).size,
    left: cards + algos,
    cards,
    algos,
  };
}

/**
 * Tomorrow's split before anything is done (the native fallback when a new day starts before the next sync): the
 * reviews pending tomorrow first, the rest as new algorithms.
 */
export function splitTomorrow(input: {
  deck: readonly DeckCard[];
  goal: number;
  capacity: number;
  /** «не изучены» tomorrow (today's remaining new algorithms already subtracted). */
  unlearned: number;
  today?: Date;
}): { cards: number; algos: number } {
  const tomorrow = addDays(input.today ?? new Date(), 1);
  const cards = Math.min(Math.max(0, input.goal), pendingSlugs(input.deck, input.capacity, tomorrow).length);
  return { cards, algos: Math.min(Math.max(0, input.goal - cards), Math.max(0, input.unlearned)) };
}

/** One block of the learning day's plan: an algorithm, or a group of flash cards. */
export type DayItem =
  | { kind: 'algo'; costMs: number; difficulty: Difficulty; title?: string }
  | { kind: 'cards'; costMs: number; count: number };

/**
 * Spreads the day's remaining cards over the rest of the day between the remaining algorithms (in suggestion order).
 * The cards are split into floor(cards / MIN_CARD_GROUP) groups (at least one), as even as possible with the larger
 * ones first, so no group is smaller than MIN_CARD_GROUP unless fewer cards are left. Card groups and algorithms are
 * each placed at the centre of their own equal share of the sequence (cards first on a tie), e.g. 5 cards +
 * 3 algorithms = [A, 3 cards, B, 2 cards, C], 4 cards + 2 algorithms = [2 cards, A, 2 cards, B]. Called again on every
 * sync with what is left, so cards answered early shrink and re-spread the remaining groups. Mirrored in StudyPlan.kt.
 */
export function planItems(
  algos: readonly { costMs: number; difficulty: Difficulty; title?: string }[],
  cards: number,
  cardCostMs: number,
): DayItem[] {
  const groups = cards <= 0 ? 0 : Math.max(1, Math.floor(cards / MIN_CARD_GROUP));
  const n = algos.length;
  const items: DayItem[] = [];
  let g = 0;
  let a = 0;
  while (g < groups || a < n) {
    // Group g sits at (2g + 1) / 2·groups, algorithm a at (2a + 1) / 2n; compared without division.
    if (g < groups && (a >= n || (2 * g + 1) * n <= (2 * a + 1) * groups)) {
      const count = Math.floor(cards / groups) + (g < cards % groups ? 1 : 0);
      items.push({ kind: 'cards', count, costMs: count * cardCostMs });
      g++;
    } else {
      items.push({ kind: 'algo', ...algos[a] });
      a++;
    }
  }
  return items;
}

/** Smallest flash-card group the day plan schedules (unless fewer cards are left). */
export const MIN_CARD_GROUP = 2;
