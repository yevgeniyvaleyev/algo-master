import type { Manifest } from '@/content/types';

import { planSeed } from '../seed';

const manifest: Manifest = {
  seedVersion: 2,
  topics: [
    { key: 'arrays', name: 'Arrays', order: 0 },
    { key: 'stack', name: 'Stack', order: 1 },
    { key: 'heap', name: 'Heap', order: 2 },
  ],
  algos: [
    { slug: 'a', leetcodeId: 1, title: 'A', difficulty: 'easy', topicKey: 'arrays', order: 0, leetcodeUrl: 'u/a' },
    { slug: 'b', leetcodeId: 2, title: 'B', difficulty: 'hard', topicKey: 'stack', order: 1, leetcodeUrl: 'u/b' },
  ],
};

it('inserts everything into an empty DB', () => {
  const plan = planSeed(manifest, new Set(), new Set(), new Set());
  expect(plan.topicsToInsert.map((t) => t.key)).toEqual(['arrays', 'stack', 'heap']);
  expect(plan.algosToInsert.map((a) => a.slug)).toEqual(['a', 'b']);
  expect(plan.algosToUpdate).toEqual([]);
});

it('only adds new items on upgrade and skips user-deleted topics', () => {
  const plan = planSeed(manifest, new Set(['arrays']), new Set(['a']), new Set(['stack']));
  expect(plan.topicsToInsert.map((t) => t.key)).toEqual(['heap']);
  expect(plan.algosToInsert.map((a) => a.slug)).toEqual(['b']);
  expect(plan.algosToUpdate.map((a) => a.slug)).toEqual(['a']);
});
