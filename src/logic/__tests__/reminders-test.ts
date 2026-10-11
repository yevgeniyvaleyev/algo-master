import { planReminders, reminderHours } from '../reminders';

const window = { startHour: 9, endHour: 21, intervalHours: 1 };
const at = (h: number, m = 0) => new Date(2026, 9, 11, h, m);

it('lists reminder hours inside the window', () => {
  expect(reminderHours(window)).toHaveLength(13);
  expect(reminderHours({ startHour: 9, endHour: 21, intervalHours: 3 })).toEqual([9, 12, 15, 18, 21]);
  expect(reminderHours({ startHour: 20, endHour: 8, intervalHours: 1 })).toEqual([]);
});

it('schedules only the rest of today while the goal is not met', () => {
  const plan = planReminders(window, 3, 1, at(14, 30), 1);
  expect(plan.map((r) => r.date.getHours())).toEqual([15, 16, 17, 18, 19, 20, 21]);
  expect(plan.every((r) => r.remaining === 2 && r.isToday)).toBe(true);
});

it('skips today once the goal is met but keeps the following days', () => {
  const plan = planReminders(window, 3, 3, at(10), 3);
  expect(plan.some((r) => r.isToday)).toBe(false);
  expect(plan).toHaveLength(26);
  expect(plan[0].date).toEqual(new Date(2026, 9, 12, 9));
  expect(plan.every((r) => r.remaining === 3)).toBe(true);
});

it('does not schedule a reminder for the current exact minute', () => {
  const plan = planReminders(window, 3, 0, at(9), 1);
  expect(plan[0].date.getHours()).toBe(10);
});
