import * as SQLite from 'expo-sqlite';

// Fast Refresh re-runs this module after edits; opening a second connection releases the first one while other
// modules still hold it ("Cannot use shared object that was already released"). Keep one per JS runtime.
const cache = globalThis as typeof globalThis & { __algomasterDb?: SQLite.SQLiteDatabase };
export const db = (cache.__algomasterDb ??= SQLite.openDatabaseSync('algomaster.db'));

export const UNCATEGORIZED_KEY = '__uncategorized__';

const DATABASE_VERSION = 7;

/** How long a statement waits for another connection's write lock before failing with "database is locked". */
const BUSY_TIMEOUT_MS = 5_000;

/**
 * Exclusive write transaction. expo-sqlite runs it on its own connection, which (like the main one) fails at once on a
 * concurrent write unless it has a busy timeout, so one is set first. Use this instead of `withExclusiveTransactionAsync`.
 */
export async function writeTransaction(task: (tx: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    await task(tx);
  });
}

/** kv key asking the next start to erase everything (set by `requestReset`, consumed by `migrate`). */
const RESET_KEY = 'resetPending';

/**
 * Asks for everything this app stored to be erased (progress, logs, cards, custom solutions, settings in `kv`). The
 * tables are dropped on the next start, before anything else touches the database, so nothing running now hits a
 * missing table. The app must be restarted afterwards.
 */
export async function requestReset(): Promise<void> {
  await kvSet(RESET_KEY, true);
}

async function resetIfRequested(): Promise<void> {
  const hasKv = await db.getFirstAsync("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'kv'");
  if (!hasKv || !(await kvGet<boolean>(RESET_KEY))) return;
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  await writeTransaction(async (tx) => {
    for (const { name } of tables) await tx.execAsync(`DROP TABLE IF EXISTS "${name}"`);
  });
  await db.execAsync('PRAGMA user_version = 0');
}

export async function migrate(): Promise<void> {
  await db.execAsync(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  await resetIfRequested();
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

  if (version === 3) {
    // Leitner flash cards: one row per algorithm after its first answer.
    await db.execAsync(`
CREATE TABLE cards (
  slug TEXT PRIMARY KEY NOT NULL,
  box INTEGER NOT NULL,
  due_day TEXT NOT NULL,
  reviewed_at INTEGER
);
`);
    version = 4;
  }

  if (version === 4) {
    // Flash card refreshes (✓ answers) for the history and the dashboard. A card in box 2–5 got there by a ✓, so its
    // last review time is one; earlier ones are unknown.
    await db.execAsync(`
CREATE TABLE card_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  day TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX card_log_day ON card_log(day);
INSERT INTO card_log (slug, day, ts)
  SELECT slug, date(reviewed_at / 1000, 'unixepoch', 'localtime'), reviewed_at
  FROM cards WHERE box >= 2 AND reviewed_at IS NOT NULL;
`);
    version = 5;
  }

  if (version === 5) {
    // Algorithms the user has started learning but not marked learned yet (the middle state of the header toggle).
    await db.execAsync(`
CREATE TABLE in_progress (
  slug TEXT PRIMARY KEY NOT NULL,
  started_at INTEGER NOT NULL
);
`);
    version = 6;
  }

  if (version === 6) {
    // Every flash-card answer (✓ or ✗) for the daily card minimum; `ahead` = pulled ahead of its due day.
    await db.execAsync(`
CREATE TABLE card_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  day TEXT NOT NULL,
  ts INTEGER NOT NULL,
  known INTEGER NOT NULL,
  ahead INTEGER NOT NULL
);
CREATE INDEX card_reviews_day ON card_reviews(day);
`);
    version = 7;
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
