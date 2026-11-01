import { atHour } from '../budget';
import { addDays, dayKey, lastDays, logicalDay, setDayStartHour } from '../dates';
import { formatDayHeader } from '../history';
import { computeStreak } from '../progress';
import { planReminders } from '../reminders';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

describe('day start hour («Новый день с»)', () => {
  beforeEach(() => setDayStartHour(2));
  afterEach(() => setDayStartHour(0));

  it('counts time before the start hour for the previous day', () => {
    expect(dayKey(at(11, 1, 30))).toBe('2026-10-10');
    expect(dayKey(at(11, 2))).toBe('2026-10-11');
    expect(dayKey(at(11, 23, 59))).toBe('2026-10-11');
    expect(lastDays(2, at(11, 1))).toEqual(['2026-10-09', '2026-10-10']);
  });

  it('keeps midnight as the default', () => {
    setDayStartHour(0);
    expect(dayKey(at(11, 1, 30))).toBe('2026-10-11');
    expect(logicalDay(at(11, 1, 30))).toEqual(at(11, 1, 30));
  });

  it('places learning-day hours on the app day', () => {
    // At 01:00 the app day is still the 10th, so its 21:00 deadline has passed.
    expect(atHour(at(11, 1).getTime(), 21)).toBe(at(10, 21).getTime());
    expect(atHour(at(11, 3).getTime(), 21)).toBe(at(11, 21).getTime());
  });

  it('plans no reminders for the rest of a finished app day', () => {
    const plan = planReminders({ startHour: 9, endHour: 21, intervalHours: 4 }, 3, 0, at(11, 1), 2);
    expect(plan.map((r) => [r.date, r.isToday])).toEqual([
      [at(11, 9), false],
      [at(11, 13), false],
      [at(11, 17), false],
      [at(11, 21), false],
    ]);
  });

  it('follows the shifted days in the streak and history headers', () => {
    const now = at(11, 1);
    expect(computeStreak({ '2026-10-10': 3, '2026-10-09': 3 }, 3, now)).toBe(2);
    expect(formatDayHeader(new Date(2026, 9, 10), now)).toBe('Сегодня, 10 октября');
    expect(formatDayHeader(new Date(2026, 9, 9), now)).toBe('Вчера, 9 октября');
    expect(dayKey(addDays(now, 1))).toBe('2026-10-11');
  });
});
