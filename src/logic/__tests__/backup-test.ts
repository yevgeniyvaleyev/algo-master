import { backupFileName, backupsToDelete, buildBackup, isBackupDue, parseBackup, rowForSchema } from '../backup';

const tables = {
  progress: [
    { slug: 'a', learned_at: 1 },
    { slug: 'b', learned_at: 2 },
  ],
  learn_log: [
    { id: 1, slug: 'a', day: '2026-11-12', ts: 1 },
    { id: 2, slug: 'b', day: '2026-11-13', ts: 2 },
    { id: 3, slug: 'b', day: '2026-11-13', ts: 3 },
  ],
  cards: [{ slug: 'a', box: 2, due_day: '2026-11-16', reviewed_at: 1 }],
  custom_solutions: [],
  notes: [{ id: 1, slug: 'a', title: null, body: 'x', created_at: 1, updated_at: 1 }],
};

describe('parseBackup', () => {
  it('accepts its own backups and summarizes them', () => {
    const text = JSON.stringify(buildBackup(tables, 7, 1000));
    const parsed = parseBackup(text, 7);
    expect(parsed).toMatchObject({
      ok: true,
      summary: { createdAt: 1000, learned: 2, historyDays: 2, cards: 1, solutions: 0, notes: 1 },
    });
  });

  it('restores older schema versions', () => {
    expect(parseBackup(JSON.stringify(buildBackup(tables, 5, 1)), 7).ok).toBe(true);
  });

  it('rejects other files, unknown formats and newer schemas', () => {
    expect(parseBackup('not json', 7)).toMatchObject({ ok: false });
    expect(parseBackup('{"name":"x"}', 7)).toMatchObject({ ok: false, error: 'Это не резервная копия AlgoMaster' });
    expect(parseBackup(JSON.stringify({ ...buildBackup(tables, 7, 1), format: 9 }), 7).ok).toBe(false);
    expect(parseBackup(JSON.stringify(buildBackup(tables, 8, 1)), 7)).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify(buildBackup({ progress: {} as never }, 7, 1)), 7).ok).toBe(false);
  });
});

describe('rowForSchema', () => {
  it('keeps only columns of the current schema', () => {
    expect(rowForSchema({ slug: 'a', old: 1, box: null }, ['slug', 'box', 'due_day'])).toEqual({
      columns: ['slug', 'box'],
      values: ['a', null],
    });
  });
});

describe('backup files', () => {
  it('names files by day and keeps the newest ones', () => {
    expect(backupFileName('2026-11-13')).toBe('algomaster-2026-11-13.json');
    const names = [
      'algomaster-2026-11-10.json',
      'notes.txt',
      'algomaster-2026-11-13.json',
      'algomaster-2026-11-11.json',
      'algomaster-2026-11-12.json',
    ];
    expect(backupsToDelete(names, 2)).toEqual(['algomaster-2026-11-11.json', 'algomaster-2026-11-10.json']);
    expect(backupsToDelete(names, 10)).toEqual([]);
  });

  it('is due once a day', () => {
    expect(isBackupDue(null, '2026-11-13')).toBe(true);
    expect(isBackupDue('2026-11-12', '2026-11-13')).toBe(true);
    expect(isBackupDue('2026-11-13', '2026-11-13')).toBe(false);
  });
});
