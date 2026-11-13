import * as repo from '@/db/repo';
import { useDataVersion } from '@/store/data-version';
import { useSettings } from '@/store/settings';

import { syncBackground } from './background';
import type { CardWrite } from './leitner';
import { expirationCutoff, type AlgoStatus } from './progress';

const bump = () => useDataVersion.getState().bump();

/** Wraps a repo mutation so every screen refreshes afterwards. */
function mutation<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    await fn(...args);
    bump();
  };
}

/** Sets the header toggle's state: not learned, in progress or learned. */
export const setStatus = mutation(async (slug: string, status: AlgoStatus) => {
  if (status === 'inProgress') await repo.setInProgress(slug);
  else await repo.setLearned(slug, status === 'learned');
  void syncBackground();
});
/** Applies several mark/unmark changes at once (bulk mode on the Algorithms list). */
export const setLearnedMany = mutation(async (changes: { slug: string; learned: boolean }[]) => {
  for (const c of changes) await repo.setLearned(c.slug, c.learned);
  void syncBackground();
});
/** Card answers change the daily card minimum; reviews come in quick bursts, so the background sync waits a bit. */
const CARD_SYNC_DELAY_MS = 2_000;
let cardSync: ReturnType<typeof setTimeout> | undefined;
export const saveCardWrites = mutation(async (writes: readonly CardWrite[]) => {
  await repo.saveCardWrites(writes);
  if (!writes.some((w) => w.review)) return;
  clearTimeout(cardSync);
  cardSync = setTimeout(() => void syncBackground(), CARD_SYNC_DELAY_MS);
});
export const createTopic = mutation(repo.createTopic);
export const renameTopic = mutation(repo.renameTopic);
export const deleteTopic = mutation(repo.deleteTopic);
export const moveAlgo = mutation(repo.moveAlgo);
export const saveCustomSolution = mutation(repo.saveCustomSolution);
export const deleteCustomSolution = mutation(repo.deleteCustomSolution);

/** Applies auto-unmark expiration; called on startup and when the app returns to foreground. */
export async function runExpiration(): Promise<void> {
  const { autoUnmark, expireDays } = useSettings.getState();
  const cutoff = expirationCutoff(autoUnmark, expireDays);
  if (cutoff == null) return;
  if ((await repo.expireProgress(cutoff)) > 0) bump();
}
