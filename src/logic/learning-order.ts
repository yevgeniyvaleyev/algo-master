import type { Difficulty } from '@/content/types';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export interface OrderableAlgo {
  difficulty: Difficulty;
  /** Sort order of the algorithm's topic. */
  topicOrder: number;
  /** Sort order of the algorithm inside its topic. */
  sortOrder: number;
}

/**
 * Learning plan over the algorithms that are still unlearned: topics take turns (round-robin in topic order),
 * and each turn picks the topic's easiest remaining algorithm (easy → medium → hard, then by position).
 * So a topic whose easy ones are done contributes a medium one while the next topic may still give an easy one.
 *
 * `afterTopicOrder` is the topic of the most recently learned algorithm: the plan starts with the topic after it,
 * so consecutive suggestions move through all topics instead of staying in one.
 */
export function learningOrder<T extends OrderableAlgo>(unlearned: readonly T[], afterTopicOrder?: number | null): T[] {
  const byTopic = new Map<number, T[]>();
  for (const a of unlearned) byTopic.set(a.topicOrder, [...(byTopic.get(a.topicOrder) ?? []), a]);
  for (const queue of byTopic.values()) {
    queue.sort((x, y) => DIFFICULTY_RANK[x.difficulty] - DIFFICULTY_RANK[y.difficulty] || x.sortOrder - y.sortOrder);
  }

  const topics = [...byTopic.keys()].sort((a, b) => a - b);
  if (afterTopicOrder != null) {
    const start = topics.findIndex((t) => t > afterTopicOrder);
    if (start > 0) topics.push(...topics.splice(0, start));
  }

  const plan: T[] = [];
  while (plan.length < unlearned.length) {
    for (const t of topics) {
      const next = byTopic.get(t)!.shift();
      if (next) plan.push(next);
    }
  }
  return plan;
}
