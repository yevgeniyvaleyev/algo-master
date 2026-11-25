import { dayKey, lastDays } from '../dates';
import { algoStatus, computeStreak, nextStatus } from '../progress';

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
  it('counts a day with credit as met when the reduced goal is reached', () => {
    const counts = { '2026-10-10': 1, '2026-10-11': 3 };
    expect(computeStreak(counts, 3, today)).toBe(1);
    expect(computeStreak(counts, 3, today, { '2026-10-10': 2 })).toBe(2);
  });

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

describe('algoStatus / nextStatus', () => {
  it('prefers learned over in progress', () => {
    expect(algoStatus({ learnedAt: null, inProgressAt: null })).toBe('none');
    expect(algoStatus({ learnedAt: null, inProgressAt: 1 })).toBe('inProgress');
    expect(algoStatus({ learnedAt: 2, inProgressAt: 1 })).toBe('learned');
  });

  it('cycles none → in progress → learned → none', () => {
    expect(nextStatus('none')).toBe('inProgress');
    expect(nextStatus('inProgress')).toBe('learned');
    expect(nextStatus('learned')).toBe('none');
  });
});
