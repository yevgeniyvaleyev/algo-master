import { alarmScreen, type AlarmDayState } from '../alarm-screen';
import { reminderContent } from '../reminders';

const day: AlarmDayState = {
  learnedToday: 1,
  goal: 3,
  cardsLeft: 3,
  cardDailyGoal: 5,
  cardsReviewedToday: 2,
  cardsDue: 7,
  cardsDueByBox: [4, 1, 0, 2, 0],
  deadline: '21:00',
};

describe('alarmScreen', () => {
  it('describes an algorithm block', () => {
    expect(
      alarmScreen({ kind: 'algo', title: '88. Merge Sorted Array', difficulty: 'medium', costMs: 45 * 60_000 }, day),
    ).toEqual({
      heading: '⏰ Время учить',
      title: '88. Merge Sorted Array',
      detail: 'Medium · ~45 мин.',
      lines: ['Изучено сегодня 1 из 3 · карточек осталось 3 · учебный день до 21:00'],
    });
  });

  it('describes a card group with today’s card numbers and non-empty boxes', () => {
    expect(alarmScreen({ kind: 'cards', count: 3, costMs: 6 * 60_000 }, day)).toEqual({
      heading: '⏰ Время повторить карточки',
      title: 'Карточки: 3',
      detail: '~6 мин.',
      lines: [
        'Повторено сегодня 2 из 5 · к повтору 7',
        'По коробкам: 1 — 4 · 2 — 1 · 4 — 2',
        'Изучено алгоритмов 1 из 3 · учебный день до 21:00',
      ],
    });
  });

  it('leaves out empty parts', () => {
    const quiet = { ...day, cardsLeft: 0, cardDailyGoal: 0, cardsDueByBox: [0, 0, 0, 0, 0] };
    expect(alarmScreen({ kind: 'algo', title: 'A', difficulty: 'easy', costMs: 30 * 60_000 }, quiet).lines).toEqual([
      'Изучено сегодня 1 из 3 · учебный день до 21:00',
    ]);
    expect(alarmScreen({ kind: 'cards', count: 2, costMs: 4 * 60_000 }, quiet).lines.slice(0, 2)).toEqual([
      'Повторено сегодня 2 · к повтору 7',
      'Изучено алгоритмов 1 из 3 · учебный день до 21:00',
    ]);
  });
});

describe('reminderContent', () => {
  const today = { date: new Date(), isToday: true, goal: 8, done: 3 };
  it('counts what is left today', () => {
    expect(reminderContent({ ...today, cards: 1, algos: 2 })).toEqual({
      title: 'Дневная цель не выполнена',
      body: 'Выполнено 3 из 8. Осталось повторить 1 карточку и изучить 2 алгоритма.',
    });
  });
  it('asks only for what is left', () => {
    expect(reminderContent({ ...today, cards: 0, algos: 1 }).body).toBe(
      'Выполнено 3 из 8. Осталось изучить 1 алгоритм.',
    );
  });
  it('announces the goal on later days', () => {
    expect(reminderContent({ date: new Date(), isToday: false, goal: 8, done: 0, cards: 0, algos: 0 }).body).toBe(
      'Цель на сегодня — 8 карточек. Пора начинать!',
    );
  });
});
