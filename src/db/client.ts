import { File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { parseBackup, rowForSchema, type Backup } from '@/logic/backup';

// Fast Refresh re-runs this module after edits; opening a second connection releases the first one while other
// modules still hold it ("Cannot use shared object that was already released"). Keep one per JS runtime.
const cache = globalThis as typeof globalThis & { __algomasterDb?: SQLite.SQLiteDatabase };
export const db = (cache.__algomasterDb ??= SQLite.openDatabaseSync('algomaster.db'));

export const UNCATEGORIZED_KEY = '__uncategorized__';

export const DATABASE_VERSION = 10;

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
 * Asks for everything this app stored to be erased (progress, logs, cards, custom solutions, notes, settings in `kv`). The
 * tables are dropped on the next start, before anything else touches the database, so nothing running now hits a
 * missing table. The app must be restarted afterwards.
 */
export async function requestReset(): Promise<void> {
  await kvSet(RESET_KEY, true);
}

/** All user tables (everything but SQLite's own). */
export async function tableNames(): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  return rows.map((r) => r.name);
}

async function dropAllTables(): Promise<void> {
  const tables = await tableNames();
  await writeTransaction(async (tx) => {
    for (const name of tables) await tx.execAsync(`DROP TABLE IF EXISTS "${name}"`);
  });
  await db.execAsync('PRAGMA user_version = 0');
}

async function resetIfRequested(): Promise<void> {
  const hasKv = await db.getFirstAsync("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'kv'");
  if (hasKv && (await kvGet<boolean>(RESET_KEY))) await dropAllTables();
}

/**
 * Backup waiting to be restored (written by `requestRestore` in `src/db/backup.ts`). Like a reset, a restore is applied
 * on the next start before anything else touches the database.
 */
export const pendingRestoreFile = () => new File(Paths.document, 'restore-pending.json');
/** kv key with the error of the last failed restore (shown in Settings). */
export const RESTORE_ERROR_KEY = 'restoreError';

function takePendingRestore(): Backup | null {
  const file = pendingRestoreFile();
  if (!file.exists) return null;
  const parsed = parseBackup(file.textSync(), DATABASE_VERSION);
  if (parsed.ok) return parsed.backup;
  file.delete();
  return null;
}

/** Replaces the freshly migrated tables' rows with the backup's (only columns the current schema has). */
async function applyRestore(backup: Backup): Promise<void> {
  const existing = new Set(await tableNames());
  const columns = new Map<string, string[]>();
  for (const name of Object.keys(backup.tables)) {
    if (!existing.has(name)) continue;
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${name}")`);
    columns.set(
      name,
      info.map((c) => c.name),
    );
  }
  await writeTransaction(async (tx) => {
    for (const [name, cols] of columns) {
      await tx.runAsync(`DELETE FROM "${name}"`);
      for (const row of backup.tables[name]) {
        const r = rowForSchema(row, cols);
        if (r.columns.length === 0) continue;
        await tx.runAsync(
          `INSERT INTO "${name}" (${r.columns.map((c) => `"${c}"`).join(', ')}) VALUES (${r.columns.map(() => '?').join(', ')})`,
          r.values as SQLite.SQLiteBindValue[],
        );
      }
    }
  });
}

export async function migrate(): Promise<void> {
  await db.execAsync(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  await resetIfRequested();
  const restore = takePendingRestore();
  if (restore) await dropAllTables();
  await runMigrations();
  if (!restore) return;
  try {
    await applyRestore(restore);
    pendingRestoreFile().delete();
    await kvSet(RESTORE_ERROR_KEY, null);
  } catch (e) {
    // Rolled back: start empty rather than retry a broken restore on every start. The pre-restore safety copy is in
    // the internal backups folder.
    pendingRestoreFile().delete();
    await kvSet(RESTORE_ERROR_KEY, String(e));
  }
}

async function runMigrations(): Promise<void> {
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

  if (version === 7) {
    // The user's own notes per algorithm (e.g. an explanation pasted from a chat assistant), Markdown.
    await db.execAsync(`
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX notes_slug ON notes(slug);
`);
    version = 8;
  }

  if (version === 8) {
    // «Взять в долг»: algorithms / cards moved from `day` to the next `days` days (repayment is computed, see credit.ts).
    await db.execAsync(`
CREATE TABLE credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  algos INTEGER NOT NULL,
  cards INTEGER NOT NULL,
  days INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
`);
    version = 9;
  }

  if (version === 9) {
    // Every algorithm is a card now and marks no longer expire: drop boxes left behind by unmarked algorithms, so a
    // relearned one starts in «ждут» again.
    await db.execAsync('DELETE FROM cards WHERE slug NOT IN (SELECT slug FROM progress);');
    version = 10;
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
