import type { Difficulty } from '@/content/types';

import { dayKey } from './dates';
import { formatDayMonth } from './history';
import { boxCounts, dueCount, MAX_BOX, pendingSlugs, type DeckCard } from './leitner';

/**
 * Flash card statistics (pure, tested): a summary, one row per algorithm with its pile, due state and answer counts,
 * plus filters and sorts for the «Статистика карточек» screen. Every algorithm is a card: «не изучены» (never learned)
 * → «ждут» (learned, outside the box) → boxes 1–5. Answer counts come from `card_reviews` (logged since DB v7).
 */

/** An algorithm in the «не изучены» pile (no learned mark); `inProgress` = started («изучаю»). */
export interface UnlearnedAlgo {
  slug: string;
  leetcodeId: number | null;
  title: string;
  difficulty: Difficulty;
  inProgress: boolean;
}

export interface ReviewTotals {
  slug: string;
  known: number;
  unknown: number;
  lastTs: number;
  lastKnown: number;
}

export type DueState =
  | { kind: 'unlearned'; inProgress: boolean }
  | { kind: 'waiting' }
  | { kind: 'rotation' }
  | { kind: 'today' }
  | { kind: 'overdue'; days: number }
  | { kind: 'later'; days: number; day: string };

export interface CardStatRow {
  slug: string;
  leetcodeId: number | null;
  title: string;
  difficulty: Difficulty;
  /** Box 1–5, or null while waiting outside the box or not learned yet (`due.kind === 'unlearned'`). */
  box: number | null;
  dueDay: string | null;
  due: DueState;
  /** To review today (`pendingSlugs`: box 1, its refills, due boxes 2–5). */
  pending: boolean;
  known: number;
  unknown: number;
  /** Share of ✓ answers (0–1), null without answers. */
  accuracy: number | null;
  lastTs: number | null;
  lastKnown: boolean | null;
}

export interface CardStatsSummary {
  /** Learned algorithms (cards in «ждут» and the boxes). */
  total: number;
  /** Never learned algorithms. */
  unlearned: number;
  waiting: number;
  boxes: number[];
  pending: number;
  known: number;
  unknown: number;
  accuracy: number | null;
}

export type CardFilter = 'pending' | 'unlearned' | 'waiting' | 'all' | number;
export type CardSort = 'due' | 'hard' | 'number';

const accuracyOf = (known: number, unknown: number) => (known + unknown > 0 ? known / (known + unknown) : null);

/** Whole days from day key `a` to day key `b`. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function dueState(card: DeckCard, today: string): DueState {
  if (card.box == null) return { kind: 'waiting' };
  if (card.box === 1) return { kind: 'rotation' };
  const day = card.dueDay ?? today;
  const days = daysBetween(today, day);
  if (days === 0) return { kind: 'today' };
  return days < 0 ? { kind: 'overdue', days: -days } : { kind: 'later', days, day };
}

export function buildCardStats(
  deck: readonly DeckCard[],
  totals: readonly ReviewTotals[],
  capacity: number,
  today: Date = new Date(),
  unlearned: readonly UnlearnedAlgo[] = [],
): { summary: CardStatsSummary; rows: CardStatRow[] } {
  const key = dayKey(today);
  const bySlug = new Map(totals.map((t) => [t.slug, t]));
  const pending = new Set(pendingSlugs(deck, capacity, today));
  const rows = deck.map((c): CardStatRow => {
    const t = bySlug.get(c.slug);
    const known = t?.known ?? 0;
    const unknown = t?.unknown ?? 0;
    return {
      slug: c.slug,
      leetcodeId: c.leetcodeId,
      title: c.title,
      difficulty: c.difficulty,
      box: c.box == null ? null : Math.min(MAX_BOX, Math.max(1, c.box)),
      dueDay: c.dueDay,
      due: dueState(c, key),
      pending: pending.has(c.slug),
      known,
      unknown,
      accuracy: accuracyOf(known, unknown),
      lastTs: t?.lastTs ?? null,
      lastKnown: t == null ? null : t.lastKnown === 1,
    };
  });
  const known = rows.reduce((n, r) => n + r.known, 0);
  const unknown = rows.reduce((n, r) => n + r.unknown, 0);
  for (const a of unlearned) {
    rows.push({
      slug: a.slug,
      leetcodeId: a.leetcodeId,
      title: a.title,
      difficulty: a.difficulty,
      box: null,
      dueDay: null,
      due: { kind: 'unlearned', inProgress: a.inProgress },
      pending: false,
      known: 0,
      unknown: 0,
      accuracy: null,
      lastTs: null,
      lastKnown: null,
    });
  }
  return {
    summary: {
      total: deck.length,
      unlearned: unlearned.length,
      ...boxCounts(deck),
      pending: dueCount(deck, capacity, today),
      known,
      unknown,
      accuracy: accuracyOf(known, unknown),
    },
    rows,
  };
}

export function filterRows(rows: readonly CardStatRow[], filter: CardFilter): CardStatRow[] {
  if (filter === 'all') return [...rows];
  if (filter === 'pending') return rows.filter((r) => r.pending);
  if (filter === 'unlearned') return rows.filter((r) => r.due.kind === 'unlearned');
  if (filter === 'waiting') return rows.filter((r) => r.due.kind === 'waiting');
  return rows.filter((r) => r.box === filter);
}

const byNumber = (a: CardStatRow, b: CardStatRow) =>
  (a.leetcodeId ?? Infinity) - (b.leetcodeId ?? Infinity) || a.slug.localeCompare(b.slug);

/** Sort key for «По сроку»: pending cards first (most overdue first), then by due day; waiting, then unlearned last. */
function dueKey(r: CardStatRow): [number, number] {
  switch (r.due.kind) {
    case 'overdue':
      return [0, -r.due.days];
    case 'today':
    case 'rotation':
      return [0, 0];
    case 'later':
      return [1, r.due.days];
    case 'waiting':
      return [r.pending ? 0 : 2, 1];
    case 'unlearned':
      return [3, r.due.inProgress ? 0 : 1];
  }
}

export function sortRows(rows: readonly CardStatRow[], sort: CardSort): CardStatRow[] {
  const sorted = [...rows];
  if (sort === 'number') return sorted.sort(byNumber);
  if (sort === 'hard')
    return sorted.sort(
      (a, b) => b.unknown - a.unknown || (a.accuracy ?? Infinity) - (b.accuracy ?? Infinity) || byNumber(a, b),
    );
  return sorted.sort((a, b) => {
    const [ag, ad] = dueKey(a);
    const [bg, bd] = dueKey(b);
    return ag - bg || ad - bd || (b.box ?? 0) - (a.box ?? 0) || byNumber(a, b);
  });
}

/** «просрочено 2 дн.», «сегодня», «через 3 дн. · 24 ноября», «по кругу», «ждёт» / «ждёт — сегодня», «не изучено». */
export function dueLabel(row: CardStatRow, today: Date = new Date()): string {
  const d = row.due;
  switch (d.kind) {
    case 'unlearned':
      return d.inProgress ? 'изучаю' : 'не изучено';
    case 'waiting':
      return row.pending ? 'ждёт — войдёт сегодня' : 'ждёт';
    case 'rotation':
      return 'по кругу';
    case 'today':
      return 'сегодня';
    case 'overdue':
      return `просрочено ${d.days} дн.`;
    case 'later': {
      const [y, m, day] = d.day.split('-').map(Number);
      return d.days === 1 ? 'завтра' : `через ${d.days} дн. · ${formatDayMonth(new Date(y, m - 1, day), today)}`;
    }
  }
}

export type DifficultyCounts = Record<Difficulty, number>;

const emptyCounts = (): DifficultyCounts => ({ easy: 0, medium: 0, hard: 0 });

/** Cards per difficulty in each pile: never learned, waiting outside the box, and boxes 1–5. */
export function difficultyByPile(rows: readonly CardStatRow[]): {
  unlearned: DifficultyCounts;
  waiting: DifficultyCounts;
  boxes: DifficultyCounts[];
} {
  const unlearned = emptyCounts();
  const waiting = emptyCounts();
  const boxes = Array.from({ length: MAX_BOX }, emptyCounts);
  for (const r of rows) {
    const pile = r.due.kind === 'unlearned' ? unlearned : r.box == null ? waiting : boxes[r.box - 1];
    pile[r.difficulty]++;
  }
  return { unlearned, waiting, boxes };
}
