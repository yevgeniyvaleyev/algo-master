import type { Difficulty } from '@/content/types';

import { addDays, dayKey } from './dates';

export interface HistoryEntry {
  /** Marked learned, or refreshed with a flash card (✓). */
  kind: 'learned' | 'refreshed';
  day: string;
  slug: string;
  /** First time of that kind for the algorithm that day. */
  ts: number;
  leetcodeId: number | null;
  title: string;
  difficulty: Difficulty;
}

export interface HistoryDay {
  day: string;
  date: Date;
  items: HistoryEntry[];
  /** Distinct algorithms marked learned / refreshed that day. */
  learned: number;
  refreshed: number;
}

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** Groups history rows by day for the given day keys (in that order), keeping days with nothing done. */
export function groupHistory(rows: readonly HistoryEntry[], dayKeys: readonly string[]): HistoryDay[] {
  const byDay = new Map<string, HistoryEntry[]>();
  for (const r of rows) {
    const list = byDay.get(r.day) ?? [];
    list.push(r);
    byDay.set(r.day, list);
  }
  return dayKeys.map((day) => {
    const [y, m, d] = day.split('-').map(Number);
    const items = [...(byDay.get(day) ?? [])].sort((a, b) => a.ts - b.ts);
    const count = (kind: HistoryEntry['kind']) => items.filter((i) => i.kind === kind).length;
    return { day, date: new Date(y, m - 1, d), items, learned: count('learned'), refreshed: count('refreshed') };
  });
}

/** «Сегодня, 14 октября», «Вчера, 13 октября», «Понедельник, 12 октября» (+ the year when it differs). */
export function formatDayHeader(date: Date, today: Date = new Date()): string {
  const key = dayKey(date);
  const name =
    key === dayKey(today) ? 'Сегодня' : key === dayKey(addDays(today, -1)) ? 'Вчера' : WEEKDAYS[date.getDay()];
  return `${name}, ${formatDayMonth(date, today)}`;
}

/** «14 октября» (+ the year when it differs from today's). */
export function formatDayMonth(date: Date, today: Date = new Date()): string {
  const year = date.getFullYear() !== today.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${year}`;
}
