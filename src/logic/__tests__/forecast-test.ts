import { forecastFinish, recentPace } from '../forecast';

const now = new Date(2026, 9, 11, 15, 0).getTime();
const DAY = 86_400_000;
const learnedDaysAgo = (count: number, days: number) => Array.from({ length: count }, () => now - days * DAY);

describe('forecastFinish', () => {
  it('counts plain days', () => {
    const f = forecastFinish({ total: 150, learnedAt: [], learnedToday: 0, perDay: 3, now });
    expect(f?.days).toBe(49);
    expect(f?.date).toEqual(new Date(2026, 10, 29));
  });

  it("uses only the rest of today's quota today", () => {
    const f = forecastFinish({
      total: 10,
      learnedAt: learnedDaysAgo(2, 0),
      learnedToday: 2,
      perDay: 3,
      now,
    });
    // Today: 1 more (7 left), then 3/day: 4, 1, 0 -> day 3.
    expect(f?.days).toBe(3);
  });

  it('is today when everything is already learned', () => {
    expect(forecastFinish({ total: 2, learnedAt: learnedDaysAgo(2, 1), learnedToday: 0, perDay: 3, now })?.days).toBe(
      0,
    );
  });

  it('handles a fractional pace', () => {
    expect(forecastFinish({ total: 5, learnedAt: [], learnedToday: 0, perDay: 0.5, now })?.days).toBe(9);
  });

  it('is null without any pace', () => {
    expect(forecastFinish({ total: 5, learnedAt: [], learnedToday: 0, perDay: 0, now })).toBeNull();
  });
});

describe('recentPace', () => {
  it('averages distinct algorithms per day', () => {
    expect(recentPace({ a: 3, b: 0, c: 3 }, ['a', 'b', 'c'])).toBe(2);
  });
});
