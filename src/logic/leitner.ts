import type { Difficulty } from '@/content/types';

import { addDays, dayKey } from './dates';

/**
 * Leitner flash cards over learned algorithms. Learned algorithms without a card wait outside the box; box 1 holds
 * at most `capacity` cards that rotate in the session (✓ → box 2 and the oldest waiting card takes the place, ✗ → back
 * of the rotation). Boxes 2–5 are reviewed by date: box b is due BOX_INTERVAL_DAYS[b − 1] × factor days after its last
 * ✓; ✓ moves a card up (box 5 stays in box 5), ✗ sends it back into the box-1 rotation.
 */
export const BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length;

export interface DeckCard {
  slug: string;
  leetcodeId: number | null;
  title: string;
  difficulty: Difficulty;
  /** null = waiting outside the box (no `cards` row yet). */
  box: number | null;
  /** Due day of boxes 2–5; ignored for box 1. */
  dueDay: string | null;
  learnedAt: number;
  reviewedAt: number | null;
}

/** A `cards` row to upsert; `refreshMark` also resets the learned mark (a ✓ answer). */
export interface CardWrite {
  slug: string;
  box: number;
  dueDay: string;
  refreshMark: boolean;
}

export interface Session {
  /** Local copy of the deck, updated by every answer. */
  deck: DeckCard[];
  /** Slugs still to show; queue[0] is the current card. */
  queue: string[];
  /** Answers given in this session (a key for resetting the card view). */
  step: number;
}

export interface SessionOptions {
  capacity: number;
  factor: number;
  today?: Date;
  now?: number;
}

/** Review interval of a box in whole days (≥ 1), scaled by the interval factor. */
export function boxInterval(box: number, factor: number): number {
  const base = BOX_INTERVAL_DAYS[Math.min(MAX_BOX, Math.max(1, box)) - 1];
  return Math.max(1, Math.round(base * factor));
}

const isDue = (c: DeckCard, today: string) => c.box != null && c.box >= 2 && (c.dueDay ?? '') <= today;
const box1 = (deck: readonly DeckCard[]) => deck.filter((c) => c.box === 1);
/** Longest-waiting first: a card waits since it was marked learned; bulk marks share a time and tie by number. */
const byWaitTime = (a: DeckCard, b: DeckCard) =>
  a.learnedAt - b.learnedAt || (a.leetcodeId ?? Infinity) - (b.leetcodeId ?? Infinity) || a.slug.localeCompare(b.slug);
const waiting = (deck: readonly DeckCard[]) => deck.filter((c) => c.box == null).sort(byWaitTime);

/** Moves the longest-waiting cards into box 1 until it holds `capacity` cards. */
function refill(deck: DeckCard[], capacity: number, today: string, now: number) {
  const free = capacity - box1(deck).length;
  const moved = free > 0 ? waiting(deck).slice(0, free) : [];
  const writes: CardWrite[] = [];
  for (const c of moved) {
    Object.assign(c, { box: 1, dueDay: today, reviewedAt: now });
    writes.push({ slug: c.slug, box: 1, dueDay: today, refreshMark: false });
  }
  return { moved: moved.map((c) => c.slug), writes };
}

/** Fills box 1 and orders the queue: due cards of boxes 2–5 (weakest, most overdue first), then box 1's rotation. */
export function startSession(
  source: readonly DeckCard[],
  { capacity, today = new Date(), now = Date.now() }: Omit<SessionOptions, 'factor'>,
): { session: Session; writes: CardWrite[] } {
  const key = dayKey(today);
  const deck = source.map((c) => ({ ...c }));
  const { writes } = refill(deck, capacity, key, now);
  const due = deck
    .filter((c) => isDue(c, key))
    .sort((a, b) => a.box! - b.box! || (a.dueDay ?? '').localeCompare(b.dueDay ?? ''));
  const rotation = box1(deck).sort((a, b) => (a.reviewedAt ?? 0) - (b.reviewedAt ?? 0) || byWaitTime(a, b));
  return { session: { deck, queue: [...due, ...rotation].map((c) => c.slug), step: 0 }, writes };
}

/** Answers the current card (queue[0]). */
export function answer(
  session: Session,
  known: boolean,
  { capacity, factor, today = new Date(), now = Date.now() }: SessionOptions,
): { session: Session; writes: CardWrite[] } {
  const [slug, ...rest] = session.queue;
  const deck = session.deck.map((c) => ({ ...c }));
  const card = deck.find((c) => c.slug === slug);
  if (!card) return { session: { ...session, queue: rest }, writes: [] };

  const key = dayKey(today);
  const from = card.box ?? 1;
  let queue = rest;
  let writes: CardWrite[];
  if (known) {
    const box = Math.min(MAX_BOX, from + 1);
    const dueDay = dayKey(addDays(today, boxInterval(box, factor)));
    Object.assign(card, { box, dueDay, reviewedAt: now });
    writes = [{ slug, box, dueDay, refreshMark: true }];
    if (from === 1) {
      const filled = refill(deck, capacity, key, now);
      queue = [...queue, ...filled.moved];
      writes = [...writes, ...filled.writes];
    }
  } else {
    // Into (or back to the end of) the box-1 rotation; over capacity is fine, refills wait until there's room.
    Object.assign(card, { box: 1, dueDay: key, reviewedAt: now });
    writes = [{ slug, box: 1, dueDay: key, refreshMark: false }];
    queue = [...queue, slug];
  }
  return { session: { deck, queue, step: session.step + 1 }, writes };
}

/** Shows the next (+1) or previous (−1) card without answering; the queue is a circle. */
export function browse(session: Session, dir: 1 | -1): Session {
  const { queue } = session;
  if (queue.length < 2) return session;
  const next = dir === 1 ? [...queue.slice(1), queue[0]] : [queue[queue.length - 1], ...queue.slice(0, -1)];
  return { ...session, queue: next, step: session.step + 1 };
}

/** Cards to review now: due ones of boxes 2–5 plus box 1 as it will be after a refill. */
export function dueCount(deck: readonly DeckCard[], capacity: number, today: Date = new Date()): number {
  const due = dueByBox(deck, capacity, today);
  return due.waiting + due.boxes.reduce((sum, n) => sum + n, 0);
}

/**
 * Cards to review per pile (same shape as `boxCounts`): all of box 1 (it rotates), the waiting cards that will refill
 * it up to `capacity`, and the due cards of boxes 2–5. Sums to `dueCount`.
 */
export function dueByBox(
  deck: readonly DeckCard[],
  capacity: number,
  today: Date = new Date(),
): { waiting: number; boxes: number[] } {
  const key = dayKey(today);
  const boxes: number[] = Array(MAX_BOX).fill(0);
  for (const c of deck) {
    if (c.box === 1 || (c.box != null && isDue(c, key))) boxes[Math.min(MAX_BOX, c.box) - 1]++;
  }
  const refill = Math.max(0, Math.min(capacity, boxes[0] + waiting(deck).length) - boxes[0]);
  return { waiting: refill, boxes };
}

/** Waiting cards and cards per box (index 0 = box 1). */
export function boxCounts(deck: readonly Pick<DeckCard, 'box'>[]): { waiting: number; boxes: number[] } {
  const boxes: number[] = Array(MAX_BOX).fill(0);
  let waitingCount = 0;
  for (const c of deck) {
    if (c.box == null) waitingCount++;
    else boxes[Math.min(MAX_BOX, Math.max(1, c.box)) - 1]++;
  }
  return { waiting: waitingCount, boxes };
}

/** Earliest due day of boxes 2–5 after today, or null. */
export function nextDueDay(deck: readonly DeckCard[], today: Date = new Date()): string | null {
  const key = dayKey(today);
  const later = deck
    .filter((c) => c.box != null && c.box >= 2)
    .map((c) => c.dueDay)
    .filter((d): d is string => d != null && d > key);
  return later.length > 0 ? later.sort()[0] : null;
}
