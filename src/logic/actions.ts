import * as repo from '@/db/repo';
import { useDataVersion } from '@/store/data-version';

import { syncBackground } from './background';
import type { Credit } from './credit';
import type { CardWrite } from './leitner';
import type { AlgoStatus } from './progress';

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
export const saveNote = mutation(repo.saveNote);
export const deleteNote = mutation(repo.deleteNote);
/** «Взять в долг»: today's goal shrinks, the next 1–2 days' grow (see credit.ts). */
export const takeCredit = mutation(async (c: Credit) => {
  await repo.addCredit(c);
  void syncBackground();
});
