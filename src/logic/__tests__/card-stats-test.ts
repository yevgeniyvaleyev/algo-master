import { buildCardStats, difficultyByPile, dueLabel, filterRows, sortRows, type ReviewTotals } from '../card-stats';
import type { DeckCard } from '../leitner';

const today = new Date(2026, 10, 20, 12); // 20 Nov 2026

const card = (slug: string, leetcodeId: number, box: number | null, dueDay: string | null = null): DeckCard => ({
  slug,
  leetcodeId,
  title: slug,
  difficulty: 'easy',
  box,
  dueDay,
  learnedAt: leetcodeId,
  reviewedAt: null,
});

const deck: DeckCard[] = [
  card('rot', 1, 1, '2026-11-20'),
  card('overdue', 2, 3, '2026-11-18'),
  card('today', 3, 2, '2026-11-20'),
  card('later', 4, 4, '2026-11-25'),
  card('tomorrow', 5, 5, '2026-11-21'),
  card('wait-a', 6, null),
  card('wait-b', 7, null),
];

const totals: ReviewTotals[] = [
  { slug: 'rot', known: 1, unknown: 3, lastTs: 10, lastKnown: 0 },
  { slug: 'overdue', known: 4, unknown: 0, lastTs: 20, lastKnown: 1 },
  { slug: 'later', known: 2, unknown: 2, lastTs: 30, lastKnown: 1 },
];

// Capacity 2: box 1 holds one card, so one waiting card (the longest-waiting, wait-a) refills it today.
const { summary, rows } = buildCardStats(deck, totals, 2, today);
const row = (slug: string) => rows.find((r) => r.slug === slug)!;

describe('buildCardStats', () => {
  it('summarizes piles, pending and answers', () => {
    expect(summary).toEqual({
      total: 7,
      unlearned: 0,
      waiting: 2,
      boxes: [1, 1, 1, 1, 1],
      pending: 4, // rot + its refill + overdue + today
      known: 7,
      unknown: 5,
      accuracy: 7 / 12,
    });
  });

  it('marks due state and pending per card', () => {
    expect(row('rot')).toMatchObject({ due: { kind: 'rotation' }, pending: true, accuracy: 0.25, lastKnown: false });
    expect(row('overdue')).toMatchObject({ due: { kind: 'overdue', days: 2 }, pending: true });
    expect(row('today')).toMatchObject({ due: { kind: 'today' }, pending: true, accuracy: null, lastTs: null });
    expect(row('later')).toMatchObject({ due: { kind: 'later', days: 5 }, pending: false });
    expect(row('wait-a')).toMatchObject({ box: null, due: { kind: 'waiting' }, pending: true });
    expect(row('wait-b').pending).toBe(false);
  });
});

describe('filterRows', () => {
  const slugs = (f: Parameters<typeof filterRows>[1]) => filterRows(rows, f).map((r) => r.slug);
  it('filters by pending, waiting and box', () => {
    expect(slugs('pending')).toEqual(['rot', 'overdue', 'today', 'wait-a']);
    expect(slugs('waiting')).toEqual(['wait-a', 'wait-b']);
    expect(slugs(4)).toEqual(['later']);
    expect(slugs('all')).toHaveLength(7);
  });
});

describe('sortRows', () => {
  const slugs = (s: Parameters<typeof sortRows>[1]) => sortRows(rows, s).map((r) => r.slug);
  it('puts overdue first, then today, then later by days, waiting last', () => {
    expect(slugs('due')).toEqual(['overdue', 'today', 'rot', 'wait-a', 'tomorrow', 'later', 'wait-b']);
  });
  it('puts the most-missed cards first', () => {
    expect(slugs('hard').slice(0, 3)).toEqual(['rot', 'later', 'overdue']);
  });
  it('sorts by LeetCode number', () => {
    expect(slugs('number')).toEqual(['rot', 'overdue', 'today', 'later', 'tomorrow', 'wait-a', 'wait-b']);
  });
});

describe('dueLabel', () => {
  it('describes each state', () => {
    expect(dueLabel(row('overdue'), today)).toBe('просрочено 2 дн.');
    expect(dueLabel(row('today'), today)).toBe('сегодня');
    expect(dueLabel(row('rot'), today)).toBe('по кругу');
    expect(dueLabel(row('tomorrow'), today)).toBe('завтра');
    expect(dueLabel(row('later'), today)).toBe('через 5 дн. · 25 ноября');
    expect(dueLabel(row('wait-a'), today)).toBe('ждёт — войдёт сегодня');
    expect(dueLabel(row('wait-b'), today)).toBe('ждёт');
  });
});

describe('difficultyByPile', () => {
  it('counts difficulties per pile', () => {
    const mixed = buildCardStats(
      [
        { ...card('a', 1, 2, '2026-11-25'), difficulty: 'hard' },
        { ...card('b', 2, 2, '2026-11-25'), difficulty: 'easy' },
        { ...card('c', 3, null), difficulty: 'medium' },
      ],
      [],
      2,
      today,
    ).rows;
    const piles = difficultyByPile(mixed);
    expect(piles.waiting).toEqual({ easy: 0, medium: 1, hard: 0 });
    expect(piles.boxes[1]).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(piles.boxes[0]).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});

describe('unlearned pile', () => {
  const unlearned = [
    { slug: 'new-a', leetcodeId: 8, title: 'new-a', difficulty: 'hard' as const, inProgress: false },
    { slug: 'new-b', leetcodeId: 9, title: 'new-b', difficulty: 'medium' as const, inProgress: true },
  ];
  const all = buildCardStats(deck, totals, 2, today, unlearned);
  const slugs = (f: Parameters<typeof filterRows>[1]) => filterRows(all.rows, f).map((r) => r.slug);

  it('counts never learned algorithms apart from the learned cards', () => {
    expect(all.summary).toMatchObject({ total: 7, unlearned: 2, waiting: 2, pending: 4 });
  });

  it('filters them separately from «ждут» and lists them under «Все»', () => {
    expect(slugs('unlearned')).toEqual(['new-a', 'new-b']);
    expect(slugs('waiting')).toEqual(['wait-a', 'wait-b']);
    expect(slugs('all')).toHaveLength(9);
    expect(slugs('pending')).not.toContain('new-a');
  });

  it('sorts them last by due, the one in progress first', () => {
    expect(
      sortRows(all.rows, 'due')
        .map((r) => r.slug)
        .slice(-3),
    ).toEqual(['wait-b', 'new-b', 'new-a']);
  });

  it('labels them and counts their difficulty', () => {
    const row = (slug: string) => all.rows.find((r) => r.slug === slug)!;
    expect(dueLabel(row('new-a'), today)).toBe('не изучено');
    expect(dueLabel(row('new-b'), today)).toBe('изучаю');
    expect(difficultyByPile(all.rows).unlearned).toEqual({ easy: 0, medium: 1, hard: 1 });
    expect(difficultyByPile(all.rows).waiting).toEqual({ easy: 2, medium: 0, hard: 0 });
  });
});
