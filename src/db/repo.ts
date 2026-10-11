import type { Difficulty, Manifest } from '@/content/types';
import { addDays, dayKey } from '@/logic/dates';
import { learningOrder } from '@/logic/learning-order';
import type { DailyCounts } from '@/logic/progress';
import { planSeed } from '@/logic/seed';

import { db, kvGet, kvSet, UNCATEGORIZED_KEY } from './client';

export interface Topic {
  id: number;
  seedKey: string | null;
  name: string;
  sortOrder: number;
}

export interface AlgoRow {
  slug: string;
  leetcodeId: number | null;
  title: string;
  difficulty: Difficulty;
  topicId: number;
  sortOrder: number;
  leetcodeUrl: string;
  learnedAt: number | null;
}

export interface TopicWithAlgos extends Topic {
  algos: AlgoRow[];
  learned: number;
}

const DELETED_TOPICS_KEY = 'deletedSeedTopics';
const SEED_VERSION_KEY = 'seedVersion';

// ---------- Seeding ----------

export async function runSeed(manifest: Manifest): Promise<void> {
  const current = (await kvGet<number>(SEED_VERSION_KEY)) ?? 0;
  if (current >= manifest.seedVersion) return;

  const topicRows = await db.getAllAsync<{ seed_key: string }>(
    'SELECT seed_key FROM topics WHERE seed_key IS NOT NULL',
  );
  const algoRows = await db.getAllAsync<{ slug: string }>('SELECT slug FROM algos');
  const deleted = (await kvGet<string[]>(DELETED_TOPICS_KEY)) ?? [];
  const plan = planSeed(
    manifest,
    new Set(topicRows.map((r) => r.seed_key)),
    new Set(algoRows.map((r) => r.slug)),
    new Set(deleted),
  );

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const t of plan.topicsToInsert) {
      await tx.runAsync('INSERT INTO topics (seed_key, name, sort_order) VALUES (?, ?, ?)', t.key, t.name, t.order);
    }
    const keyToId = new Map(
      (
        await tx.getAllAsync<{ id: number; seed_key: string }>(
          'SELECT id, seed_key FROM topics WHERE seed_key IS NOT NULL',
        )
      ).map((r) => [r.seed_key, r.id]),
    );
    const fallback = keyToId.get(UNCATEGORIZED_KEY)!;
    for (const a of plan.algosToInsert) {
      await tx.runAsync(
        'INSERT INTO algos (slug, leetcode_id, title, difficulty, topic_id, sort_order, leetcode_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        a.slug,
        a.leetcodeId,
        a.title,
        a.difficulty,
        keyToId.get(a.topicKey) ?? fallback,
        a.order,
        a.leetcodeUrl,
      );
    }
    for (const a of plan.algosToUpdate) {
      await tx.runAsync(
        'UPDATE algos SET leetcode_id = ?, title = ?, difficulty = ?, sort_order = ?, leetcode_url = ? WHERE slug = ?',
        a.leetcodeId,
        a.title,
        a.difficulty,
        a.order,
        a.leetcodeUrl,
        a.slug,
      );
    }
    await tx.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      SEED_VERSION_KEY,
      JSON.stringify(manifest.seedVersion),
    );
  });
}

// ---------- Topics ----------

export async function listTopics(): Promise<Topic[]> {
  return db.getAllAsync<Topic>(
    'SELECT id, seed_key AS seedKey, name, sort_order AS sortOrder FROM topics ORDER BY sort_order, id',
  );
}

export async function listTopicsWithAlgos(): Promise<TopicWithAlgos[]> {
  const topics = await listTopics();
  const algos = await db.getAllAsync<AlgoRow>(`
    SELECT a.slug, a.leetcode_id AS leetcodeId, a.title, a.difficulty, a.topic_id AS topicId, a.sort_order AS sortOrder,
           a.leetcode_url AS leetcodeUrl, p.learned_at AS learnedAt
    FROM algos a LEFT JOIN progress p ON p.slug = a.slug
    ORDER BY a.sort_order, a.leetcode_id`);
  const byTopic = new Map<number, AlgoRow[]>();
  for (const a of algos) {
    const list = byTopic.get(a.topicId) ?? [];
    list.push(a);
    byTopic.set(a.topicId, list);
  }
  return topics
    .map((t) => {
      const list = byTopic.get(t.id) ?? [];
      return { ...t, algos: list, learned: list.filter((a) => a.learnedAt != null).length };
    })
    .filter((t) => t.seedKey !== UNCATEGORIZED_KEY || t.algos.length > 0);
}

export async function createTopic(name: string): Promise<void> {
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM topics WHERE seed_key IS NOT ? ',
    UNCATEGORIZED_KEY,
  );
  await db.runAsync('INSERT INTO topics (name, sort_order) VALUES (?, ?)', name.trim(), row?.next ?? 0);
}

export async function renameTopic(id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE topics SET name = ? WHERE id = ?', name.trim(), id);
}

/** Deletes a topic; its algorithms move to "Без темы". The uncategorized topic cannot be deleted. */
export async function deleteTopic(id: number): Promise<void> {
  const topic = await db.getFirstAsync<{ seed_key: string | null }>('SELECT seed_key FROM topics WHERE id = ?', id);
  if (!topic || topic.seed_key === UNCATEGORIZED_KEY) return;
  const fallback = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM topics WHERE seed_key = ?',
    UNCATEGORIZED_KEY,
  );
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE algos SET topic_id = ? WHERE topic_id = ?', fallback!.id, id);
    await tx.runAsync('DELETE FROM topics WHERE id = ?', id);
  });
  if (topic.seed_key) {
    const deleted = (await kvGet<string[]>(DELETED_TOPICS_KEY)) ?? [];
    await kvSet(DELETED_TOPICS_KEY, [...new Set([...deleted, topic.seed_key])]);
  }
}

export async function moveAlgo(slug: string, topicId: number): Promise<void> {
  await db.runAsync('UPDATE algos SET topic_id = ? WHERE slug = ?', topicId, slug);
}

// ---------- Progress ----------

export async function getAlgo(slug: string): Promise<AlgoRow | null> {
  return db.getFirstAsync<AlgoRow>(
    `SELECT a.slug, a.leetcode_id AS leetcodeId, a.title, a.difficulty, a.topic_id AS topicId, a.sort_order AS sortOrder,
            a.leetcode_url AS leetcodeUrl, p.learned_at AS learnedAt
     FROM algos a LEFT JOIN progress p ON p.slug = a.slug WHERE a.slug = ?`,
    slug,
  );
}

export async function setLearned(slug: string, learned: boolean, now: Date = new Date()): Promise<void> {
  const today = dayKey(now);
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (learned) {
      await tx.runAsync(
        'INSERT INTO progress (slug, learned_at) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET learned_at = excluded.learned_at',
        slug,
        now.getTime(),
      );
      await tx.runAsync('INSERT INTO learn_log (slug, day, ts) VALUES (?, ?, ?)', slug, today, now.getTime());
    } else {
      await tx.runAsync('DELETE FROM progress WHERE slug = ?', slug);
      // Unmarking on the same day takes the credit back, so the daily quota stays honest.
      await tx.runAsync('DELETE FROM learn_log WHERE slug = ? AND day = ?', slug, today);
    }
  });
}

/** Removes marks older than the cutoff. Returns how many were unmarked. */
export async function expireProgress(cutoff: number): Promise<number> {
  const res = await db.runAsync('DELETE FROM progress WHERE learned_at < ?', cutoff);
  return res.changes;
}

// ---------- Custom solutions ----------

export async function getCustomSolution(slug: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ code: string }>('SELECT code FROM custom_solutions WHERE slug = ?', slug);
  return row?.code ?? null;
}

export async function saveCustomSolution(slug: string, code: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO custom_solutions (slug, code, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(slug) DO UPDATE SET code = excluded.code, updated_at = excluded.updated_at',
    slug,
    code,
    Date.now(),
  );
}

export async function deleteCustomSolution(slug: string): Promise<void> {
  await db.runAsync('DELETE FROM custom_solutions WHERE slug = ?', slug);
}

// ---------- Stats ----------

export async function getDailyCounts(days: number, today: Date = new Date()): Promise<DailyCounts> {
  const since = dayKey(addDays(today, -days + 1));
  const rows = await db.getAllAsync<{ day: string; n: number }>(
    'SELECT day, COUNT(DISTINCT slug) AS n FROM learn_log WHERE day >= ? GROUP BY day',
    since,
  );
  return Object.fromEntries(rows.map((r) => [r.day, r.n]));
}

export async function getTodayCount(today: Date = new Date()): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(DISTINCT slug) AS n FROM learn_log WHERE day = ?',
    dayKey(today),
  );
  return row?.n ?? 0;
}

export interface DifficultyStat {
  difficulty: Difficulty;
  total: number;
  learned: number;
}

export async function getDifficultyStats(): Promise<DifficultyStat[]> {
  return db.getAllAsync<DifficultyStat>(`
    SELECT a.difficulty, COUNT(*) AS total, COUNT(p.slug) AS learned
    FROM algos a LEFT JOIN progress p ON p.slug = a.slug
    GROUP BY a.difficulty`);
}

export async function getTotalLearnEvents(): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM learn_log');
  return row?.n ?? 0;
}

export async function getNextUnlearned(limit: number): Promise<AlgoRow[]> {
  const rows = await db.getAllAsync<AlgoRow & { topicOrder: number }>(
    `SELECT a.slug, a.leetcode_id AS leetcodeId, a.title, a.difficulty, a.topic_id AS topicId, a.sort_order AS sortOrder,
            a.leetcode_url AS leetcodeUrl, p.learned_at AS learnedAt, t.sort_order AS topicOrder
     FROM algos a
     JOIN topics t ON t.id = a.topic_id
     LEFT JOIN progress p ON p.slug = a.slug`,
  );
  return learningOrder(rows)
    .filter((a) => a.learnedAt == null)
    .slice(0, limit)
    .map(({ topicOrder: _topicOrder, ...a }) => a);
}
