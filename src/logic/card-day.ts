import type { Difficulty } from '@/content/types';

import { closestToDue, pendingSlugs, type DeckCard } from './leitner';

/**
 * Daily flash-card minimum («Карточек в день»). Each distinct card answered ✓ today (also in the card gate) counts
 * once; ✗ only passes the entry gate and leaves the card pending. With fewer cards pending than the minimum, the
 * pending ones are enough; when nothing at all is pending (and no regular card was reviewed today), the `ahead` cards
 * closest to their due day are pulled ahead instead.
 */
export interface CardDay {
  /** The setting; 0 = off. */
  goal: number;
  /** Distinct cards answered today. */
  reviewed: number;
  /** What today asks for: `reviewed + left`, or the goal once it is met. Below the goal when there aren't enough cards. */
  target: number;
  /** Cards still to review today. */
  left: number;
  /** Cards to pull ahead of their due day (nothing pending), soonest due first. */
  ahead: string[];
}

export function cardDay(input: {
  deck: readonly DeckCard[];
  /** Distinct slugs answered today. */
  reviewed: readonly string[];
  /** How many of them were pulled ahead. */
  aheadReviewed: number;
  goal: number;
  /** «Вперёд, если нечего повторять»: cards to pull ahead when nothing is pending. */
  ahead: number;
  capacity: number;
  today?: Date;
}): CardDay {
  const { deck, goal, today = new Date() } = input;
  const reviewed = new Set(input.reviewed);
  const n = reviewed.size;
  const result = (left: number, ahead: string[] = []): CardDay => ({
    goal,
    reviewed: n,
    target: n >= goal ? Math.max(goal, 0) : n + left,
    left,
    ahead,
  });
  if (goal <= 0 || n >= goal) return result(0);

  const open = pendingSlugs(deck, input.capacity, today).filter((s) => !reviewed.has(s)).length;
  if (open > 0) return result(Math.min(goal - n, open));

  // Nothing pending: pull ahead, unless what was pending today has already been reviewed.
  if (n - input.aheadReviewed > 0) return result(0);
  const want = Math.min(goal, input.ahead) - input.aheadReviewed;
  const ahead = closestToDue(
    deck.filter((c) => !reviewed.has(c.slug)),
    want,
    today,
  );
  return result(ahead.length, ahead);
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
