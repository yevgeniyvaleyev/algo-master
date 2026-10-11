import type { Manifest, ManifestAlgo, ManifestTopic } from '@/content/types';

export interface SeedPlan {
  topicsToInsert: ManifestTopic[];
  algosToInsert: ManifestAlgo[];
  /** Existing algos: refresh title/difficulty/url/order, but keep the user's topic choice. */
  algosToUpdate: ManifestAlgo[];
}

/**
 * Diff the bundled manifest against what is already in the DB.
 * Topics the user deleted (deletedTopicKeys) are not recreated.
 */
export function planSeed(
  manifest: Manifest,
  existingTopicKeys: ReadonlySet<string>,
  existingSlugs: ReadonlySet<string>,
  deletedTopicKeys: ReadonlySet<string>,
): SeedPlan {
  return {
    topicsToInsert: manifest.topics.filter((t) => !existingTopicKeys.has(t.key) && !deletedTopicKeys.has(t.key)),
    algosToInsert: manifest.algos.filter((a) => !existingSlugs.has(a.slug)),
    algosToUpdate: manifest.algos.filter((a) => existingSlugs.has(a.slug)),
  };
}
