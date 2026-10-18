import { lastDays } from '../dates';
import { formatDayHeader, groupHistory, type HistoryEntry } from '../history';

const today = new Date(2026, 9, 14, 15, 0);
const entry = (day: string, slug: string, ts: number, kind: HistoryEntry['kind'] = 'learned'): HistoryEntry => ({
  kind,
  day,
  slug,
  ts,
  leetcodeId: null,
  title: slug,
  difficulty: 'easy',
});

describe('groupHistory', () => {
  it('groups by day newest first, keeps empty days and puts the latest entry on top', () => {
    const days = lastDays(3, today).reverse();
    const groups = groupHistory(
      [entry('2026-10-14', 'b', 20), entry('2026-10-14', 'a', 10), entry('2026-10-12', 'c', 5)],
      days,
    );
    expect(groups.map((g) => g.day)).toEqual(['2026-10-14', '2026-10-13', '2026-10-12']);
    expect(groups.map((g) => g.items.map((i) => i.slug))).toEqual([['b', 'a'], [], ['c']]);
    expect(groups[0].date).toEqual(new Date(2026, 9, 14));
  });

  it('counts learned and refreshed algorithms separately', () => {
    const [day] = groupHistory(
      [
        entry('2026-10-14', 'a', 30, 'refreshed'),
        entry('2026-10-14', 'a', 10),
        entry('2026-10-14', 'b', 20, 'refreshed'),
      ],
      ['2026-10-14'],
    );
    expect(day.items.map((i) => `${i.kind}:${i.slug}`)).toEqual(['refreshed:a', 'refreshed:b', 'learned:a']);
    expect([day.learned, day.refreshed]).toEqual([1, 2]);
  });

  it('ignores rows outside the window', () => {
    expect(groupHistory([entry('2026-10-01', 'a', 1)], ['2026-10-14'])[0].items).toEqual([]);
  });
});

describe('formatDayHeader', () => {
  it('names today and yesterday', () => {
    expect(formatDayHeader(new Date(2026, 9, 14), today)).toBe('Сегодня, 14 октября');
    expect(formatDayHeader(new Date(2026, 9, 13), today)).toBe('Вчера, 13 октября');
  });

  it('uses the weekday otherwise', () => {
    expect(formatDayHeader(new Date(2026, 9, 12), today)).toBe('Понедельник, 12 октября');
    expect(formatDayHeader(new Date(2026, 9, 11), today)).toBe('Воскресенье, 11 октября');
  });

  it('adds the year for another year', () => {
    expect(formatDayHeader(new Date(2025, 11, 31), today)).toBe('Среда, 31 декабря 2025');
  });
});
