import { cardDay, planItems } from '../card-day';
import { answer, startSession, type DeckCard } from '../leitner';

const today = new Date(2026, 9, 15, 15, 0);

const card = (slug: string, patch: Partial<DeckCard> = {}): DeckCard => ({
  slug,
  leetcodeId: null,
  title: slug,
  difficulty: 'easy',
  box: null,
  dueDay: null,
  learnedAt: 0,
  reviewedAt: null,
  ...patch,
});
const inBox1 = (n: number) => Array.from({ length: n }, (_, i) => card(`r${i}`, { box: 1, reviewedAt: i }));
// Boxes 2–5, none due today; c0 is due soonest.
const notDue = (n: number) =>
  Array.from({ length: n }, (_, i) => card(`c${i}`, { box: 2 + (i % 2), dueDay: `2026-10-${16 + i}` }));
const base = { goal: 5, ahead: 2, capacity: 10, aheadReviewed: 0, today };

describe('cardDay', () => {
  it('asks for the full minimum when enough cards are pending', () => {
    expect(cardDay({ ...base, deck: inBox1(8), reviewed: [] })).toMatchObject({ target: 5, left: 5, ahead: [] });
    expect(cardDay({ ...base, deck: inBox1(8), reviewed: ['r0', 'r1'] })).toMatchObject({ reviewed: 2, left: 3 });
  });

  it('settles for what is pending when there are fewer cards', () => {
    expect(cardDay({ ...base, deck: [...inBox1(3), ...notDue(4)], reviewed: [] })).toMatchObject({
      target: 3,
      left: 3,
      ahead: [],
    });
    // A box-1 card answered ✗ stays pending but already counts.
    expect(cardDay({ ...base, deck: inBox1(3), reviewed: ['r0', 'r1', 'r2'] })).toMatchObject({
      reviewed: 3,
      target: 3,
      left: 0,
    });
  });

  it('counts waiting cards that will refill box 1 as pending', () => {
    expect(cardDay({ ...base, deck: [card('w0'), card('w1')], reviewed: [] }).left).toBe(2);
    expect(cardDay({ ...base, capacity: 1, deck: [card('w0'), card('w1')], reviewed: [] }).left).toBe(1);
  });

  it('pulls the cards closest to due ahead when nothing is pending', () => {
    const deck = notDue(4);
    expect(cardDay({ ...base, deck, reviewed: [] })).toMatchObject({ target: 2, left: 2, ahead: ['c0', 'c1'] });
    // One done ahead (now moved further out), one more to go.
    const moved = deck.map((c) => (c.slug === 'c0' ? { ...c, box: 3, dueDay: '2026-10-22' } : c));
    expect(cardDay({ ...base, deck: moved, reviewed: ['c0'], aheadReviewed: 1 })).toMatchObject({
      left: 1,
      ahead: ['c1'],
    });
    expect(cardDay({ ...base, deck: moved, reviewed: ['c0', 'c1'], aheadReviewed: 2 })).toMatchObject({
      target: 2,
      left: 0,
    });
  });

  it('does not pull ahead once the pending cards were reviewed today', () => {
    expect(cardDay({ ...base, deck: notDue(4), reviewed: ['x'] })).toMatchObject({ left: 0, ahead: [] });
  });

  it('never pulls ahead more than the minimum or what exists', () => {
    expect(cardDay({ ...base, goal: 1, deck: notDue(4), reviewed: [] }).ahead).toEqual(['c0']);
    expect(cardDay({ ...base, ahead: 5, deck: notDue(1), reviewed: [] }).ahead).toEqual(['c0']);
    expect(cardDay({ ...base, ahead: 0, deck: notDue(4), reviewed: [] }).left).toBe(0);
  });

  it('is off with goal 0 and after the minimum', () => {
    expect(cardDay({ ...base, goal: 0, deck: inBox1(8), reviewed: [] })).toMatchObject({ target: 0, left: 0 });
    const reviewed = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'];
    expect(cardDay({ ...base, deck: inBox1(8), reviewed })).toMatchObject({ reviewed: 6, target: 5, left: 0 });
  });

  it('asks again for cards that become pending later in the day until the goal is met', () => {
    // The only card was answered ✓ (now in box 2): nothing left, 1 of 5.
    const answered = card('a', { box: 2, dueDay: '2026-10-18' });
    expect(cardDay({ ...base, deck: [answered], reviewed: ['a'] })).toMatchObject({ reviewed: 1, left: 0 });
    // A newly learned algorithm's card waits for box 1: it is asked for.
    expect(cardDay({ ...base, deck: [answered, card('b')], reviewed: ['a'] })).toMatchObject({ left: 1, target: 2 });
  });

  it('counts the same card once', () => {
    expect(cardDay({ ...base, deck: inBox1(8), reviewed: ['r0', 'r0', 'r0'] }).reviewed).toBe(1);
  });
});

describe('ahead sessions', () => {
  it('reviews the pulled-ahead cards when nothing is due and marks their answers', () => {
    const deck = notDue(3);
    const { session } = startSession(deck, { capacity: 10, today, ahead: ['c0', 'c1'] });
    expect(session.queue).toEqual(['c0', 'c1']);
    const { writes } = answer(session, true, { capacity: 10, factor: 1, today });
    expect(writes[0]).toMatchObject({ slug: 'c0', box: 3, review: { known: true, ahead: true } });
  });

  it('ignores ahead cards while something is due', () => {
    const { session } = startSession([...inBox1(1), ...notDue(2)], { capacity: 10, today, ahead: ['c0'] });
    expect(session.queue).toEqual(['r0']);
    expect(session.ahead).toBeUndefined();
  });
});

describe('planItems', () => {
  const algo = (title: string) => ({ difficulty: 'easy' as const, costMs: 30, title });

  const shape = (items: ReturnType<typeof planItems>) => items.map((i) => (i.kind === 'cards' ? i.count : i.title));
  const abc = [algo('A'), algo('B'), algo('C')];

  it('spreads groups of at least two cards evenly between the algorithms, larger first', () => {
    expect(shape(planItems(abc, 5, 2))).toEqual(['A', 3, 'B', 2, 'C']);
    expect(planItems(abc, 5, 2)[1].costMs).toBe(6);
    expect(shape(planItems([algo('A'), algo('B')], 4, 2))).toEqual([2, 'A', 2, 'B']);
    expect(shape(planItems([algo('A')], 5, 2))).toEqual([3, 'A', 2]);
    expect(shape(planItems(abc, 6, 2))).toEqual([2, 'A', 2, 'B', 2, 'C']);
    expect(shape(planItems([algo('A')], 10, 2))).toEqual([2, 2, 2, 'A', 2, 2]);
  });

  it('spreads the cards over the day once the algorithms are done', () => {
    expect(shape(planItems([], 5, 2))).toEqual([3, 2]);
    expect(shape(planItems([], 3, 2))).toEqual([3]);
  });

  it('keeps a single smaller group when fewer than two cards are left', () => {
    expect(shape(planItems(abc, 1, 2))).toEqual(['A', 1, 'B', 'C']);
    expect(shape(planItems([algo('A')], 0, 2))).toEqual(['A']);
  });
});
