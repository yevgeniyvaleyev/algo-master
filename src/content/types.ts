export type Difficulty = 'easy' | 'medium' | 'hard';

/** Bundled, read-only content of one algorithm (data/algos/<slug>.json). */
export interface AlgoContent {
  slug: string;
  /** LeetCode problem number (frontend id), e.g. 88. */
  leetcodeId: number;
  title: string;
  difficulty: Difficulty;
  group: string;
  leetcodeUrl: string;
  /** Original English condition, as on LeetCode. */
  conditionMd: string;
  // Generated fields below are absent until the Russian content for this algorithm is written.
  /** Russian translation of the condition. */
  descriptionRuMd?: string;
  /** TypeScript solution with inline comments in Russian. */
  solutionTs?: string;
  /** Idea of the solution in Russian. */
  ideaRuMd?: string;
  theory?: { topicKey: string; titleRu: string };
}

/** Shared theory note (data/theory/<key>.json). */
export interface TheoryContent {
  key: string;
  titleRu: string;
  bodyMd: string;
}

export interface ManifestTopic {
  key: string;
  name: string;
  order: number;
}

export interface ManifestAlgo {
  slug: string;
  leetcodeId: number;
  title: string;
  difficulty: Difficulty;
  topicKey: string;
  order: number;
  leetcodeUrl: string;
}

/** data/manifest.json — the seed for the topics/algos tables. */
export interface Manifest {
  seedVersion: number;
  contentHash?: string;
  topics: ManifestTopic[];
  algos: ManifestAlgo[];
}
