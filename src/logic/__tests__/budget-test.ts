import { algoCostMs, atHour, availableMs, dayTimeline, grantedMs, reserveMs, type UpcomingAlgo } from '../budget';

const MIN = 60_000;
const day = new Date(2026, 9, 11).getTime();
const at = (h: number, m = 0) => day + h * 60 * MIN + m * MIN;
const deadline = at(22);
const learnedEasy = (...ts: number[]) => ts.map((t) => ({ ts: t, costMs: 30 * MIN }));
const easy = (n: number): UpcomingAlgo[] => Array.from({ length: n }, () => ({ difficulty: 'easy', costMs: 30 * MIN }));

describe('algoCostMs / reserveMs', () => {
  it('scales the base time by difficulty', () => {
    const factors = { easy: 1, medium: 1.5, hard: 2 };
    expect(algoCostMs('easy', 30, factors)).toBe(30 * MIN);
    expect(algoCostMs('medium', 30, factors)).toBe(45 * MIN);
    expect(algoCostMs('hard', 30, factors)).toBe(60 * MIN);
  });

  it('reserves the next `left` algorithms', () => {
    const upcoming: UpcomingAlgo[] = [
      { difficulty: 'easy', costMs: 30 * MIN },
      { difficulty: 'hard', costMs: 60 * MIN },
      { difficulty: 'medium', costMs: 45 * MIN },
    ];
    expect(reserveMs(2, upcoming)).toBe(90 * MIN);
    expect(reserveMs(0, upcoming)).toBe(0);
  });

  it('builds local hour timestamps', () => {
    expect(atHour(at(15, 40), 22)).toBe(deadline);
  });
});

describe('grantedMs', () => {
  it('gives the full maximum when learning early', () => {
    expect(grantedMs(learnedEasy(at(9)), 3, deadline, easy(2), 30 * MIN)).toBe(30 * MIN);
  });

  it('shares the little slack left in the evening', () => {
    // 20:20: 100 min left, 60 reserved, 40 slack / 3 shares.
    expect(grantedMs(learnedEasy(at(20, 20)), 3, deadline, easy(2), 30 * MIN)).toBe(Math.floor((40 * MIN) / 3));
    // + 20:45: 75 min left, 30 reserved, 45 slack / 2 shares.
    expect(grantedMs(learnedEasy(at(20, 20), at(20, 45)), 3, deadline, easy(1), 30 * MIN)).toBe(
      Math.floor((40 * MIN) / 3 + (45 * MIN) / 2),
    );
  });

  it('grants nothing when the remaining work no longer fits', () => {
    expect(grantedMs(learnedEasy(at(21, 10)), 3, deadline, easy(2), 30 * MIN)).toBe(0);
  });

  it('grants nothing for the event that meets the goal', () => {
    expect(grantedMs(learnedEasy(at(9), at(10), at(11)), 3, deadline, easy(0), 30 * MIN)).toBe(60 * MIN);
  });

  it('reserves the real cost of algorithms learned later in the day', () => {
    // At 20:00 a hard (60) was still ahead and learned later; one easy (30) remains: 120 - 90 = 30 slack / 3.
    const learned = [
      { ts: at(20), costMs: 30 * MIN },
      { ts: at(20, 30), costMs: 60 * MIN },
    ];
    expect(
      grantedMs(learned.slice(0, 1), 3, deadline, [{ difficulty: 'hard', costMs: 60 * MIN }, ...easy(1)], 30 * MIN),
    ).toBe(10 * MIN);
    expect(grantedMs(learned, 3, deadline, easy(1), 30 * MIN)).toBe(10 * MIN + Math.floor((90 - 30) / 2) * MIN);
  });

  it('drops the grant of an unmarked algorithm', () => {
    expect(grantedMs([], 3, deadline, easy(3), 30 * MIN)).toBe(0);
  });
});

describe('availableMs', () => {
  it('is unlimited once the goal is met', () => {
    expect(availableMs(at(23), 3, 3, 0, 0, deadline, 0)).toBeNull();
  });

  it('subtracts usage from the granted balance', () => {
    expect(availableMs(at(10), 1, 3, 30 * MIN, 10 * MIN, deadline, 60 * MIN)).toBe(20 * MIN);
  });

  it('shrinks unused morning grants as the deadline approaches', () => {
    // 30 min granted, untouched; at 20:40 only 80 - 60 = 20 min of slack is left.
    expect(availableMs(at(20, 40), 1, 3, 30 * MIN, 0, deadline, 60 * MIN)).toBe(20 * MIN);
    expect(availableMs(at(21, 30), 1, 3, 30 * MIN, 0, deadline, 60 * MIN)).toBe(0);
  });

  it('is zero after the deadline with the goal unmet', () => {
    expect(availableMs(at(22, 30), 2, 3, 30 * MIN, 0, deadline, 30 * MIN)).toBe(0);
  });
});

describe('dayTimeline', () => {
  const base = { start: at(9), end: deadline, goal: 3 };

  it('packs remaining algorithms against the deadline after fun and free time', () => {
    const t = dayTimeline({
      ...base,
      now: at(15),
      learned: [{ ts: at(10), difficulty: 'easy' }],
      upcoming: [
        { difficulty: 'medium', costMs: 45 * MIN },
        { difficulty: 'hard', costMs: 60 * MIN },
      ],
      available: 20 * MIN,
    });
    expect(t.latestStart).toBe(at(20, 15));
    expect(t.shortageMs).toBe(0);
    expect(t.segments.map((s) => [s.kind, s.start, s.end])).toEqual([
      ['past', at(9), at(15)],
      ['fun', at(15), at(15, 20)],
      ['free', at(15, 20), at(20, 15)],
      ['algo', at(20, 15), at(21)],
      ['algo', at(21), at(22)],
    ]);
    expect(t.ticks).toHaveLength(1);
  });

  it('squeezes blocks and reports the shortage when time is too short', () => {
    const t = dayTimeline({ ...base, now: at(21, 30), learned: [], upcoming: easy(3), available: 0 });
    expect(t.shortageMs).toBe(60 * MIN);
    const algos = t.segments.filter((s) => s.kind === 'algo');
    expect(algos[0].start).toBe(at(21, 30));
    expect(algos[2].end).toBe(deadline);
  });

  it('shows the rest of the day as unlimited once the goal is met', () => {
    const learned = [at(9), at(10), at(11)].map((ts) => ({ ts, difficulty: 'easy' as const }));
    const t = dayTimeline({ ...base, now: at(12), learned, upcoming: easy(3), available: null });
    expect(t.segments.at(-1)).toEqual({ kind: 'unlimited', start: at(12), end: deadline });
    expect(t.latestStart).toBeNull();
  });

  it('marks the day as ended after the deadline with the goal unmet', () => {
    const t = dayTimeline({ ...base, now: at(23), learned: [], upcoming: easy(3), available: 0 });
    expect(t.ended).toBe(true);
    expect(t.now).toBe(deadline);
    expect(t.segments).toEqual([{ kind: 'past', start: at(9), end: deadline }]);
  });

  it('clamps "now" to the start before the day begins', () => {
    const t = dayTimeline({ ...base, now: at(7), learned: [], upcoming: easy(3), available: 0 });
    expect(t.now).toBe(at(9));
    expect(t.segments[0].kind).toBe('free');
  });
});
