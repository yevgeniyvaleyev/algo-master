import { forecastFinish, recentPace, sustainable } from '../forecast';

const now = new Date(2026, 9, 11, 15, 0).getTime();
const DAY = 86_400_000;
const learnedDaysAgo = (count: number, days: number) => Array.from({ length: count }, () => now - days * DAY);

describe('forecastFinish', () => {
  it('counts plain days when marks never expire', () => {
    const f = forecastFinish({ total: 150, learnedAt: [], learnedToday: 0, perDay: 3, expireDays: null, now });
    expect(f?.days).toBe(49);
    expect(f?.date).toEqual(new Date(2026, 10, 29));
    expect(f?.refreshes).toBe(0);
  });

  it("uses only the rest of today's quota today", () => {
    const f = forecastFinish({
      total: 10,
      learnedAt: learnedDaysAgo(2, 0),
      learnedToday: 2,
      perDay: 3,
      expireDays: null,
      now,
    });
    // Today: 1 more (7 left), then 3/day: 4, 1, 0 -> day 3.
    expect(f?.days).toBe(3);
  });

  it('is today when everything is already learned', () => {
    expect(
      forecastFinish({ total: 2, learnedAt: learnedDaysAgo(2, 1), learnedToday: 0, perDay: 3, expireDays: 7, now })
        ?.days,
    ).toBe(0);
  });

  it('adds expiring marks back to the pool as refreshes', () => {
    // 100 learned 6 days ago expire tomorrow (7-day marks); 50 left, 40/day.
    const f = forecastFinish({
      total: 150,
      learnedAt: learnedDaysAgo(100, 6),
      learnedToday: 0,
      perDay: 40,
      expireDays: 7,
      now,
    });
    // Day 0: 50 -> 10; day 1: +100 -> 70; day 2: 30; day 3: 0.
    expect(f).toMatchObject({ days: 3, refreshes: 100 });
  });

  it('never finishes when expiry outpaces learning', () => {
    expect(forecastFinish({ total: 150, learnedAt: [], learnedToday: 0, perDay: 3, expireDays: 14, now })).toBeNull();
  });

  it('handles a fractional pace', () => {
    expect(forecastFinish({ total: 5, learnedAt: [], learnedToday: 0, perDay: 0.5, expireDays: null, now })?.days).toBe(
      9,
    );
  });

  it('is null without any pace', () => {
    expect(forecastFinish({ total: 5, learnedAt: [], learnedToday: 0, perDay: 0, expireDays: null, now })).toBeNull();
  });
});

describe('sustainable / recentPace', () => {
  it('explains what is needed when expiry makes the finish unreachable', () => {
    expect(sustainable(150, 3, 14)).toEqual({ ok: false, maxHeld: 42, goalNeeded: 11, daysNeeded: 50 });
    expect(sustainable(150, 3, null).ok).toBe(true);
  });

  it('averages distinct algorithms per day', () => {
    expect(recentPace({ a: 3, b: 0, c: 3 }, ['a', 'b', 'c'])).toBe(2);
  });
});
