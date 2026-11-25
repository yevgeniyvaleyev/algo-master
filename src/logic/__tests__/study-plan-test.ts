import { MIN_ALARM_GAP_MS, nextAlarmAt, planDay } from '../study-plan';

const MIN = 60_000;
const day = new Date(2026, 9, 11).getTime();
const at = (h: number, m = 0) => day + h * 60 * MIN + m * MIN;
const items = (...minutes: number[]) => minutes.map((m) => ({ costMs: m * MIN }));
const window = { start: at(9), deadline: at(22) };

describe('planDay', () => {
  it('centres each algorithm in an equal share of the day', () => {
    const plan = planDay({ ...window, now: at(9), items: items(30, 30, 30) });
    expect(plan.map((b) => b.start)).toEqual([at(10, 55), at(15, 15), at(19, 35)]);
    expect(plan.map((b) => b.end)).toEqual([at(11, 25), at(15, 45), at(20, 5)]);
  });

  it('centres blocks of different lengths on the same midpoints', () => {
    const plan = planDay({ ...window, now: at(9), items: items(30, 60) });
    // 780 min / 2 = 390: midpoints 12:15 and 18:45.
    expect(plan).toEqual([
      { start: at(12), end: at(12, 30) },
      { start: at(18, 15), end: at(19, 15) },
    ]);
  });

  it('re-plans from now after an ignored alarm', () => {
    const plan = planDay({ ...window, now: at(10, 55), items: items(30, 30, 30) });
    // 665 min / 3: first midpoint 10:55 + 110.83 min.
    expect(plan[0].start).toBeCloseTo(at(10, 55) + (665 / 6 - 15) * MIN);
  });

  it('starts at the beginning of the window when it is still early', () => {
    expect(planDay({ ...window, now: at(6), items: items(30, 30, 30) })[0].start).toBe(at(10, 55));
  });

  it('uses intervals proportional to cost when a block is longer than its share', () => {
    // 60 min left, 10 + 40: equal shares of 30 can't hold 40, so shares are 12 and 48 min.
    const plan = planDay({ ...window, now: at(21), items: items(10, 40) });
    expect(plan).toEqual([
      { start: at(21, 1), end: at(21, 11) },
      { start: at(21, 16), end: at(21, 56) },
    ]);
  });

  it('packs from now when the work does not fit', () => {
    const plan = planDay({ ...window, now: at(21, 30), items: items(30, 30) });
    expect(plan).toEqual([
      { start: at(21, 30), end: at(22) },
      { start: at(22), end: at(22, 30) },
    ]);
  });

  it('plans nothing after the deadline or without work', () => {
    expect(planDay({ ...window, now: at(22), items: items(30) })).toEqual([]);
    expect(planDay({ ...window, now: at(12), items: [] })).toEqual([]);
  });
});

describe('nextAlarmAt', () => {
  it('rings at the start of the first block', () => {
    expect(nextAlarmAt([{ start: at(12), end: at(12, 30) }], at(9))).toBe(at(12));
  });

  it('keeps a minimum gap from now', () => {
    expect(nextAlarmAt([{ start: at(12), end: at(12, 30) }], at(11, 55))).toBe(at(11, 55) + MIN_ALARM_GAP_MS);
  });

  it('is null without a plan', () => {
    expect(nextAlarmAt([], at(9))).toBeNull();
  });

  it('skips blocks whose kind of alarm is off', () => {
    const plan = [
      { start: at(12), end: at(12, 30) },
      { start: at(14), end: at(14, 10) },
    ];
    expect(nextAlarmAt(plan, at(9), [false, true])).toBe(at(14));
    expect(nextAlarmAt(plan, at(13, 55), [false, true])).toBe(at(13, 55) + MIN_ALARM_GAP_MS);
    expect(nextAlarmAt(plan, at(9), [false, false])).toBeNull();
  });
});
