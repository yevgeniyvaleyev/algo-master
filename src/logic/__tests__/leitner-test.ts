import { answer, boxCounts, browse, boxInterval, dueCount, nextDueDay, startSession, type DeckCard } from '../leitner';

const today = new Date(2026, 9, 15, 15, 0);
const now = today.getTime();
const opts = { capacity: 3, factor: 1, today, now };

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
const waitingCards = (n: number) => Array.from({ length: n }, (_, i) => card(`w${i}`, { learnedAt: 100 - i }));

describe('startSession', () => {
  it('fills box 1 with the oldest waiting cards up to the capacity', () => {
    const { session, writes } = startSession(waitingCards(5), opts);
    expect(writes.map((w) => w.slug)).toEqual(['w4', 'w3', 'w2']);
    expect(writes.every((w) => w.box === 1 && !w.refreshMark)).toBe(true);
    expect(session.queue).toEqual(['w4', 'w3', 'w2']);
    expect(boxCounts(session.deck)).toEqual({ waiting: 2, boxes: [3, 0, 0, 0, 0] });
  });

  it('puts due cards of boxes 2–5 first, then the rotation by last review', () => {
    const deck = [
      card('r1', { box: 1, reviewedAt: 50 }),
      card('r2', { box: 1, reviewedAt: 10 }),
      card('b3', { box: 3, dueDay: '2026-10-10' }),
      card('b2', { box: 2, dueDay: '2026-10-15' }),
      card('later', { box: 2, dueDay: '2026-10-20' }),
    ];
    const { session, writes } = startSession(deck, { ...opts, capacity: 2 });
    expect(writes).toEqual([]);
    expect(session.queue).toEqual(['b2', 'b3', 'r2', 'r1']);
  });
});

describe('answer', () => {
  it('moves a known box-1 card to box 2 and refills from the waiting pile', () => {
    const start = startSession(waitingCards(5), opts).session;
    const { session, writes } = answer(start, true, opts);
    expect(writes).toEqual([
      { slug: 'w4', box: 2, dueDay: '2026-10-18', refreshMark: true },
      { slug: 'w1', box: 1, dueDay: '2026-10-15', refreshMark: false },
    ]);
    expect(session.queue).toEqual(['w3', 'w2', 'w1']);
    expect(boxCounts(session.deck)).toEqual({ waiting: 1, boxes: [3, 1, 0, 0, 0] });
  });

  it('sends an unknown box-1 card to the end of the rotation', () => {
    const start = startSession(waitingCards(3), opts).session;
    const { session, writes } = answer(start, false, opts);
    expect(session.queue).toEqual(['w1', 'w0', 'w2']);
    expect(writes).toEqual([{ slug: 'w2', box: 1, dueDay: '2026-10-15', refreshMark: false }]);
  });

  it('drops an unknown higher card into the rotation without a refill over capacity', () => {
    const deck = [card('b4', { box: 4, dueDay: '2026-10-15' }), ...waitingCards(4).map((c) => ({ ...c }))];
    let { session } = startSession(deck, opts);
    expect(session.queue).toEqual(['b4', 'w3', 'w2', 'w1']);
    ({ session } = answer(session, false, opts));
    expect(session.queue).toEqual(['w3', 'w2', 'w1', 'b4']);
    expect(boxCounts(session.deck)).toEqual({ waiting: 1, boxes: [4, 0, 0, 0, 0] });
    // A known box-1 card leaves box 1 at capacity (3), so nothing is refilled.
    ({ session } = answer(session, true, opts));
    expect(boxCounts(session.deck)).toEqual({ waiting: 1, boxes: [3, 1, 0, 0, 0] });
  });

  it('promotes a known higher card with the scaled interval and keeps box 5', () => {
    const deck = [card('b2', { box: 2, dueDay: '2026-10-15' }), card('b5', { box: 5, dueDay: '2026-10-15' })];
    let { session } = startSession(deck, opts);
    let writes;
    ({ session, writes } = answer(session, true, { ...opts, factor: 2 }));
    expect(writes).toEqual([{ slug: 'b2', box: 3, dueDay: '2026-10-29', refreshMark: true }]);
    ({ session, writes } = answer(session, true, opts));
    expect(writes).toEqual([{ slug: 'b5', box: 5, dueDay: '2026-11-14', refreshMark: true }]);
    expect(session.queue).toEqual([]);
  });
});

describe('deck helpers', () => {
  it('scales intervals by the factor, at least one day', () => {
    expect([2, 3, 4, 5].map((b) => boxInterval(b, 2))).toEqual([6, 14, 28, 60]);
    expect(boxInterval(2, 0.25)).toBe(1);
  });

  it('counts box 1 after a refill plus due cards', () => {
    const deck = [card('r', { box: 1 }), card('d', { box: 2, dueDay: '2026-10-14' }), ...waitingCards(5)];
    expect(dueCount(deck, 3, today)).toBe(4);
    expect(dueCount([card('r', { box: 1 }), card('s', { box: 1 })], 1, today)).toBe(2);
  });

  it('finds the next due day of boxes 2–5', () => {
    const deck = [card('a', { box: 1, dueDay: '2026-10-15' }), card('b', { box: 3, dueDay: '2026-10-20' })];
    expect(nextDueDay(deck, today)).toBe('2026-10-20');
  });

  it('refills from the longest-waiting card, bulk marks by number', () => {
    const deck = [
      card('new', { learnedAt: 300 }),
      card('b', { learnedAt: 100, leetcodeId: 20 }),
      card('a', { learnedAt: 100, leetcodeId: 7 }),
      card('old', { learnedAt: 50 }),
    ];
    expect(startSession(deck, { ...opts, capacity: 3 }).session.queue).toEqual(['old', 'a', 'b']);
  });

  it('browses the queue in a circle without answering', () => {
    const { session } = startSession(waitingCards(3), opts);
    expect(browse(session, 1).queue).toEqual(['w1', 'w0', 'w2']);
    expect(browse(session, -1).queue).toEqual(['w0', 'w2', 'w1']);
    expect(browse(browse(session, 1), -1).queue).toEqual(session.queue);
    expect(browse(session, 1).deck).toBe(session.deck);
  });
});
