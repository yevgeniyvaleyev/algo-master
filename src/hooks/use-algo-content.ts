import { createContext, useContext, useMemo } from 'react';

import { getAlgoContent } from '@/content';

/**
 * Slug of the open algorithm, provided by `src/app/algo/[slug]/_layout.tsx`.
 * Top-tab screens don't reliably receive the parent's `[slug]` route param, so they read it from here.
 */
export const AlgoSlugContext = createContext<string>('');

export function useAlgoSlug() {
  return useContext(AlgoSlugContext);
}

export function useAlgoContent() {
  const slug = useAlgoSlug();
  return useMemo(() => getAlgoContent(slug), [slug]);
}
