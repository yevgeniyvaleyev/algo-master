import {
  borrowedByDay,
  canTakeCredit,
  creditLine,
  creditPart,
  creditState,
  daysBetween,
  installments,
  repaymentText,
  shiftDay,
} from '../credit';

const T = '2026-11-20';
const T1 = '2026-11-21';
const T2 = '2026-11-22';
const T3 = '2026-11-23';

describe('day helpers', () => {
  it('counts and shifts days across months', () => {
    expect(daysBetween('2026-11-30', '2026-12-02')).toBe(2);
    expect(shiftDay('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('installments', () => {
  it('splits over two days, the larger part first', () => {
    expect(installments(3, 1)).toEqual([3]);
    expect(installments(3, 2)).toEqual([2, 1]);
    expect(installments(1, 2)).toEqual([1, 0]);
  });
});

describe('creditPart', () => {
  // Goal 3, learned 1 on the credit day, borrowed 2.
  it('reduces the credit day goal', () => {
    expect(creditPart(2, 1, T, 3, { [T]: 1 }, T)).toMatchObject({
      todayGoal: 1,
      dueToday: 0,
      outstanding: 2,
      dueTomorrow: 2,
    });
  });

  it('adds the installment to the next day and is repaid by work above the goal', () => {
    expect(creditPart(2, 1, T, 3, { [T]: 1 }, T1)).toMatchObject({ todayGoal: 5, dueToday: 2, outstanding: 2 });
    expect(creditPart(2, 1, T, 3, { [T]: 1, [T1]: 4 }, T1)).toMatchObject({ todayGoal: 5, paid: 1, outstanding: 1 });
    expect(creditPart(2, 1, T, 3, { [T]: 1, [T1]: 5 }, T1)).toMatchObject({ paid: 2, outstanding: 0 });
  });

  it('spreads over two days', () => {
    expect(creditPart(3, 2, T, 3, { [T]: 0 }, T1)).toMatchObject({ dueToday: 2, dueTomorrow: 3 });
    expect(creditPart(3, 2, T, 3, { [T]: 0, [T1]: 5 }, T2)).toMatchObject({ dueToday: 1, todayGoal: 4 });
  });

  it('counts work done anyway on the credit day', () => {
    expect(creditPart(2, 1, T, 3, { [T]: 2 }, T)).toMatchObject({
      todayGoal: 1,
      paid: 1,
      outstanding: 1,
      dueTomorrow: 1,
    });
  });

  it('repays early', () => {
    expect(creditPart(3, 2, T, 3, { [T]: 0, [T1]: 6 }, T2)).toMatchObject({
      dueToday: 0,
      outstanding: 0,
      todayGoal: 3,
    });
  });

  it('carries a missed installment over until it is repaid', () => {
    expect(creditPart(2, 1, T, 3, { [T]: 1, [T1]: 3 }, T2)).toMatchObject({ dueToday: 2, todayGoal: 5 });
    expect(creditPart(2, 1, T, 3, { [T]: 1, [T1]: 3, [T2]: 4 }, T3)).toMatchObject({ dueToday: 1, todayGoal: 4 });
  });

  it('is empty without an amount', () => {
    expect(creditPart(0, 1, T, 5, {}, T1)).toMatchObject({ outstanding: 0, todayGoal: 5 });
  });
});

describe('creditState', () => {
  // Goal 8; borrowed 3 (an old row with 1 algorithm + 2 cards), repaid in one day.
  const credit = { day: T, algos: 1, cards: 2, days: 1 };
  const state = (done: Record<string, number>, today: string) => creditState({ credit, goal: 8, done, today })!;

  it('adds an old credit’s algorithms and cards into one amount', () => {
    const s = state({ [T]: 5 }, T1);
    expect(s.part).toMatchObject({ amount: 3, todayGoal: 11, dueToday: 3 });
    expect(s.paidOff).toBe(false);
    expect(s.lastDay).toBe(T1);
    expect(s.overdue).toBe(false);
  });

  it('is overdue after the last installment day', () => {
    expect(state({ [T]: 5 }, T2).overdue).toBe(true);
    expect(state({ [T]: 5, [T1]: 11 }, T2)).toMatchObject({ paidOff: true, overdue: false });
  });

  it('allows a new credit only once repaid and not on the same day', () => {
    expect(canTakeCredit(null, 1)).toBe(true);
    expect(canTakeCredit(null, 0)).toBe(false);
    expect(canTakeCredit(state({ [T]: 5 }, T1), 2)).toBe(false);
    expect(canTakeCredit(state({ [T]: 5, [T1]: 11 }, T1), 2)).toBe(true);
    expect(canTakeCredit(state({ [T]: 8 }, T), 1)).toBe(false);
  });
});

describe('borrowedByDay, repaymentText and creditLine', () => {
  it('maps credit days to the borrowed amount', () => {
    expect(borrowedByDay([{ day: T, algos: 2, cards: 1, days: 1 }])).toEqual({ [T]: 3 });
  });

  it('describes the installments', () => {
    expect(repaymentText(3, 2)).toBe('Завтра +2, послезавтра +1');
    expect(repaymentText(2, 1)).toBe('Завтра +2');
  });

  it('shows what is owed, by when, and today’s extra', () => {
    const credit = { day: T, algos: 0, cards: 3, days: 2 };
    const at = (today: string) =>
      creditLine(creditState({ credit, goal: 8, done: {}, today }), new Date(2026, 10, 20, 12));
    expect(at(T)).toBe('Долг: 3 карт. — до 22 ноября');
    expect(at(T1)).toBe('Долг: 3 карт. — до 22 ноября · сегодня +2');
    expect(at(T3)).toBe('Долг: 3 карт. — просрочен · сегодня +3');
    expect(creditLine(null)).toBeNull();
  });
});
