import { dayKey, lastDays } from '../dates';
import { computeStreak, expirationCutoff } from '../progress';

const today = new Date(2026, 9, 11, 15, 0);

describe('dayKey / lastDays', () => {
  it('formats local dates', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('returns oldest-first window ending today', () => {
    expect(lastDays(3, today)).toEqual(['2026-10-09', '2026-10-10', '2026-10-11']);
  });
});

describe('computeStreak', () => {
  it('counts consecutive met days including today', () => {
    const counts = { '2026-10-09': 3, '2026-10-10': 4, '2026-10-11': 3 };
    expect(computeStreak(counts, 3, today)).toBe(3);
  });

  it('starts from yesterday when today is not met yet', () => {
    const counts = { '2026-10-09': 3, '2026-10-10': 3, '2026-10-11': 1 };
    expect(computeStreak(counts, 3, today)).toBe(2);
  });

  it('breaks on a gap', () => {
    const counts = { '2026-10-08': 3, '2026-10-10': 3 };
    expect(computeStreak(counts, 3, today)).toBe(1);
  });

  it('is zero for non-positive goal', () => {
    expect(computeStreak({ '2026-10-11': 5 }, 0, today)).toBe(0);
  });
});

describe('expirationCutoff', () => {
  it('is null when auto-unmark is off', () => {
    expect(expirationCutoff(false, 7, 1_000)).toBeNull();
  });

  it('subtracts expiration days', () => {
    const now = Date.UTC(2026, 9, 11);
    expect(expirationCutoff(true, 2, now)).toBe(now - 2 * 86_400_000);
  });

  it('clamps negative days to zero', () => {
    expect(expirationCutoff(true, -3, 500)).toBe(500);
  });
});
