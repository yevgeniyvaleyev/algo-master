import { algoLoaders, theoryLoaders } from '@data/content-index';
import manifestJson from '@data/manifest.json';

import type { AlgoContent, Manifest, TheoryContent } from './types';

export const manifest = manifestJson as Manifest;

export function getAlgoContent(slug: string): AlgoContent | null {
  return algoLoaders[slug]?.() ?? null;
}

export function getTheory(key: string): TheoryContent | null {
  return theoryLoaders[key]?.() ?? null;
}
