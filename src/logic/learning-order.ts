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
 * Learning plan: all easy algorithms first, then medium, then hard. Within a difficulty the topics are
 * interleaved round-robin (1st easy of every topic, then 2nd easy of every topic, …), so every group is
 * covered gradually instead of finishing one topic before starting the next.
 *
 * The order is computed over all algorithms (learned ones included) so the plan stays stable as you progress;
 * filter out learned algorithms afterwards.
 */
export function learningOrder<T extends OrderableAlgo>(algos: readonly T[]): T[] {
  // Group by (difficulty, topic); an algorithm's position inside its group is its round.
  const groups = new Map<string, T[]>();
  for (const a of algos) {
    const key = `${DIFFICULTY_RANK[a.difficulty]}:${a.topicOrder}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const round = new Map<T, number>();
  for (const group of groups.values()) {
    group.sort((x, y) => x.sortOrder - y.sortOrder).forEach((a, i) => round.set(a, i));
  }

  return [...algos].sort(
    (x, y) =>
      DIFFICULTY_RANK[x.difficulty] - DIFFICULTY_RANK[y.difficulty] ||
      round.get(x)! - round.get(y)! ||
      x.topicOrder - y.topicOrder ||
      x.sortOrder - y.sortOrder,
  );
}
