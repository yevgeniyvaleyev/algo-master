import { planItems, splitTomorrow, studyDay } from '../card-day';
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
const base = { goal: 5, capacity: 10, learned: [] as string[], unlearned: 20, today };
const todayMs = today.getTime();

describe('studyDay', () => {
  it('asks for reviews first, up to the goal', () => {
    expect(studyDay({ ...base, deck: inBox1(8), reviewed: [] })).toMatchObject({
      done: 0,
      cards: 5,
      algos: 0,
      left: 5,
    });
    expect(studyDay({ ...base, deck: inBox1(8), reviewed: ['r0', 'r1'] })).toMatchObject({ done: 2, cards: 3 });
  });

  it('fills the rest of the goal with new algorithms once the reviews run out', () => {
    expect(studyDay({ ...base, deck: [...inBox1(3), ...notDue(4)], reviewed: [] })).toMatchObject({
      cards: 3,
      algos: 2,
      left: 5,
    });
    // Nothing due at all: the whole goal is new algorithms.
    expect(studyDay({ ...base, deck: notDue(4), reviewed: [] })).toMatchObject({ cards: 0, algos: 5 });
  });

  it('counts «ждут» cards that refill box 1 as reviews before new algorithms', () => {
    const waitingCards = Array.from({ length: 3 }, (_, i) => card(`w${i}`, { learnedAt: i }));
    expect(studyDay({ ...base, capacity: 2, deck: waitingCards, reviewed: [] })).toMatchObject({ cards: 2, algos: 3 });
  });

  it('keeps algorithms learned today out of the reviews until tomorrow', () => {
    const fresh = card('new', { learnedAt: todayMs });
    expect(studyDay({ ...base, deck: [fresh], reviewed: [], learned: ['new'] })).toMatchObject({
      done: 1,
      cards: 0,
      algos: 4,
    });
  });

  it('counts ✓ reviews and learned algorithms together, each slug once', () => {
    expect(studyDay({ ...base, deck: inBox1(8), reviewed: ['r0', 'r0', 'r1'], learned: ['x'] })).toMatchObject({
      done: 3,
      reviewed: 2,
      learned: 1,
      left: 2,
    });
  });

  it('is done once the goal is met, or when nothing is left to take', () => {
    expect(studyDay({ ...base, deck: inBox1(8), reviewed: ['r0', 'r1', 'r2', 'r3', 'r4'] })).toMatchObject({ left: 0 });
    expect(studyDay({ ...base, unlearned: 0, deck: notDue(2), reviewed: [] })).toMatchObject({ left: 0, done: 0 });
    expect(studyDay({ ...base, unlearned: 1, deck: notDue(2), reviewed: [] })).toMatchObject({ algos: 1, left: 1 });
  });
});

describe('splitTomorrow', () => {
  it('plans tomorrow’s pending reviews first, the rest as new algorithms', () => {
    // c0 is due on the 16th (tomorrow), the rest later.
    expect(splitTomorrow({ deck: notDue(4), goal: 5, capacity: 10, unlearned: 20, today })).toEqual({
      cards: 1,
      algos: 4,
    });
    expect(splitTomorrow({ deck: inBox1(8), goal: 5, capacity: 10, unlearned: 20, today })).toEqual({
      cards: 5,
      algos: 0,
    });
  });
});

describe('same-day waiting', () => {
  it('does not move an algorithm learned today into box 1', () => {
    const { session } = startSession([card('old', { learnedAt: 0 }), card('new', { learnedAt: todayMs })], {
      capacity: 10,
      today,
    });
    expect(session.queue).toEqual(['old']);
    const { writes } = answer(session, true, { capacity: 10, factor: 1, today });
    expect(writes.map((w) => w.slug)).toEqual(['old']);
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
