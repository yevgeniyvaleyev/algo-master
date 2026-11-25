import { planReminders, reminderHours } from '../reminders';

const window = { startHour: 9, endHour: 21, intervalHours: 1 };
const at = (h: number, m = 0) => new Date(2026, 9, 11, h, m);

it('lists reminder hours inside the window', () => {
  expect(reminderHours(window)).toHaveLength(13);
  expect(reminderHours({ startHour: 9, endHour: 21, intervalHours: 3 })).toEqual([9, 12, 15, 18, 21]);
  expect(reminderHours({ startHour: 20, endHour: 8, intervalHours: 1 })).toEqual([]);
});

const open = (done: number, cards: number, algos: number) => ({ goal: 8, done, cards, algos });

it('schedules only the rest of today while something of the goal is left', () => {
  const plan = planReminders(window, open(3, 3, 2), at(14, 30), 1);
  expect(plan.map((r) => r.date.getHours())).toEqual([15, 16, 17, 18, 19, 20, 21]);
  expect(plan.every((r) => r.isToday && r.done === 3 && r.cards === 3 && r.algos === 2)).toBe(true);
});

it('skips today once nothing is left but keeps the following days', () => {
  const plan = planReminders(window, open(8, 0, 0), at(10), 3, 10);
  expect(plan.some((r) => r.isToday)).toBe(false);
  expect(plan).toHaveLength(26);
  expect(plan[0].date).toEqual(new Date(2026, 9, 12, 9));
  expect(plan.filter((r) => r.date.getDate() === 12).every((r) => r.goal === 10)).toBe(true);
  expect(plan.filter((r) => r.date.getDate() === 13).every((r) => r.goal === 10)).toBe(true);
});

it('uses the base goal after tomorrow', () => {
  const plan = planReminders(window, open(0, 1, 0), at(21, 30), 3, 10, 8);
  expect(plan.filter((r) => r.date.getDate() === 13).every((r) => r.goal === 8)).toBe(true);
});

it('does not schedule a reminder for the current exact minute', () => {
  const plan = planReminders(window, open(0, 2, 1), at(9), 1);
  expect(plan[0].date.getHours()).toBe(10);
});
