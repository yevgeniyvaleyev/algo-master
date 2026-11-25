import { addDays, calendarKey } from './dates';
import { formatDayMonth } from './history';
import type { DailyCounts } from './progress';

/**
 * «Взять в долг»: part of today's goal (successful cards) moved to the next 1 or 2 days. One row in `credits`
 * (DB v9) per credit; whether it is repaid is computed from the logs, never stored. Rules (pure, tested):
 * - On the day it is taken, that day's goal shrinks by the borrowed amount (the day counts as met).
 * - It is repaid in installments on the following days: `ceil(amount / days)` the first day, the rest the second.
 * - Only work above a day's own goal repays it (the credit day's own reduced goal included, so doing it anyway the
 *   same evening repays it too). An installment that isn't repaid stays due every following day until it is.
 * - A new credit can only be taken once the previous one is repaid in full, and at most one per day.
 */
export interface Credit {
  /** App day it was taken ('YYYY-MM-DD'). */
  day: string;
  /** Before the single goal: borrowed algorithms; new credits store 0 here and the amount in `cards`. */
  algos: number;
  cards: number;
  /** Repaid over 1 or 2 days. */
  days: number;
}

/** One kind (algorithms or cards) of a credit on a given day. */
export interface CreditPart {
  amount: number;
  /** Repaid so far (today included), at most `amount`. */
  paid: number;
  outstanding: number;
  /** Extra on top of today's own goal (0 on the credit day). */
  dueToday: number;
  /** Extra on top of tomorrow's own goal if nothing more is done today. */
  dueTomorrow: number;
  /** Today's goal: base − amount on the credit day, base + dueToday afterwards. */
  todayGoal: number;
}

export interface CreditState {
  credit: Credit;
  /** The single daily goal's part (successful cards); old credits' algorithms and cards are added together. */
  part: CreditPart;
  paidOff: boolean;
  /** Taken today. */
  takenToday: boolean;
  /** Last installment day ('YYYY-MM-DD'); past it, what is left is overdue. */
  lastDay: string;
  overdue: boolean;
}

/** Amount of a credit (successful cards; rows from before the single goal stored algorithms and cards apart). */
export const creditAmount = (c: Pick<Credit, 'algos' | 'cards'>) => c.algos + c.cards;

/** Days from day key `a` to day key `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  const parse = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/** Day key `days` after day key `key`. */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return calendarKey(addDays(new Date(y, m - 1, d, 12), days));
}

/** Installments of `amount` over `days` days: [ceil(amount / days), rest]. */
export function installments(amount: number, days: number): number[] {
  if (days <= 1) return [amount];
  const first = Math.ceil(amount / 2);
  return [first, amount - first];
}

/** How much of `amount` must be repaid by the end of the day `offset` days after the credit day. */
function dueBy(amount: number, days: number, offset: number): number {
  if (offset <= 0) return 0;
  return installments(amount, days)
    .slice(0, offset)
    .reduce((a, b) => a + b, 0);
}

/**
 * One kind of a credit as of `today`. `done` = per-day count (distinct algorithms learned / cards answered ✓) for the
 * days since the credit was taken; `base` = the kind's daily goal setting.
 */
export function creditPart(
  amount: number,
  days: number,
  creditDay: string,
  base: number,
  done: DailyCounts,
  today: string,
): CreditPart {
  const span = daysBetween(creditDay, today);
  if (amount <= 0 || span < 0) {
    return { amount: 0, paid: 0, outstanding: 0, dueToday: 0, dueTomorrow: 0, todayGoal: base };
  }
  const goalOn = (offset: number) => (offset === 0 ? Math.max(0, base - amount) : base);
  let paidBefore = 0;
  for (let i = 0; i < span; i++) {
    paidBefore += Math.max(0, (done[shiftDay(creditDay, i)] ?? 0) - goalOn(i));
  }
  paidBefore = Math.min(amount, paidBefore);
  const dueToday = Math.max(0, dueBy(amount, days, span) - paidBefore);
  const paid = Math.min(amount, paidBefore + Math.max(0, (done[today] ?? 0) - goalOn(span)));
  return {
    amount,
    paid,
    outstanding: amount - paid,
    dueToday,
    dueTomorrow: Math.max(0, dueBy(amount, days, span + 1) - paid),
    todayGoal: span === 0 ? goalOn(0) : base + dueToday,
  };
}

/** The latest credit as of `today`, or null without one. `done` = successes per day, `goal` = «Цель в день». */
export function creditState(input: {
  credit: Credit | null;
  goal: number;
  done: DailyCounts;
  today: string;
}): CreditState | null {
  const { credit, today } = input;
  if (!credit) return null;
  const part = creditPart(creditAmount(credit), credit.days, credit.day, input.goal, input.done, today);
  const paidOff = part.outstanding === 0;
  const lastDay = shiftDay(credit.day, Math.max(1, credit.days));
  return {
    credit,
    part,
    paidOff,
    takenToday: credit.day === today,
    lastDay,
    overdue: !paidOff && daysBetween(lastDay, today) > 0,
  };
}

/** A new credit can be taken: nothing still owed, none taken today, and something is left to borrow. */
export function canTakeCredit(state: CreditState | null, left: number): boolean {
  if (state && (!state.paidOff || state.takenToday)) return false;
  return left > 0;
}

/** Day key → amount borrowed that day (credits reduce that day's goal for the streak and the history). */
export function borrowedByDay(credits: readonly Credit[]): DailyCounts {
  const out: DailyCounts = {};
  for (const c of credits) out[c.day] = (out[c.day] ?? 0) + creditAmount(c);
  return out;
}

/** «Завтра +2, послезавтра +1» for the credit dialog. */
export function repaymentText(amount: number, days: number): string {
  const parts = installments(amount, days);
  const names = ['Завтра', 'послезавтра'];
  return parts
    .map((n, i) => (n > 0 ? `${names[i]} +${n}` : ''))
    .filter(Boolean)
    .join(', ');
}

/** The dashboard's debt line: «Долг: 3 карт. — до 25 ноября · сегодня +2»; null once repaid. */
export function creditLine(state: CreditState | null, today: Date = new Date()): string | null {
  if (!state || state.paidOff) return null;
  const [y, m, d] = state.lastDay.split('-').map(Number);
  const when = state.overdue ? 'просрочен' : `до ${formatDayMonth(new Date(y, m - 1, d), today)}`;
  const due = state.part.dueToday > 0 ? ` · сегодня +${state.part.dueToday}` : '';
  return `Долг: ${state.part.outstanding} карт. — ${when}${due}`;
}
