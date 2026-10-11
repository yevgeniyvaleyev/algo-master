import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('algomaster.db');

export const UNCATEGORIZED_KEY = '__uncategorized__';

const DATABASE_VERSION = 3;

export async function migrate(): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
PRAGMA journal_mode = 'wal';
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seed_key TEXT UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE algos (
  slug TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  leetcode_url TEXT NOT NULL
);
CREATE TABLE progress (
  slug TEXT PRIMARY KEY NOT NULL,
  learned_at INTEGER NOT NULL
);
CREATE TABLE learn_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  day TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX learn_log_day ON learn_log(day);
CREATE TABLE kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`);
    await db.runAsync(
      'INSERT INTO topics (seed_key, name, sort_order) VALUES (?, ?, ?)',
      UNCATEGORIZED_KEY,
      'Без темы',
      1_000_000,
    );
    version = 1;
  }

  if (version === 1) {
    // User-pasted solution overriding the bundled one.
    await db.execAsync(`
CREATE TABLE custom_solutions (
  slug TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);
    version = 2;
  }

  if (version === 2) {
    // LeetCode problem number; filled by the next seed run.
    await db.execAsync('ALTER TABLE algos ADD COLUMN leetcode_id INTEGER');
    await db.runAsync("DELETE FROM kv WHERE key = 'seedVersion'");
    version = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}
