/**
 * Search on the Algorithms list (pure, tested). The query is split on whitespace and dots; every token must match:
 * a numeric token matches when the LeetCode number starts with it, any other token is a substring of the title or slug.
 */
export function matchesQuery(algo: { leetcodeId: number | null; title: string; slug: string }, query: string): boolean {
  const tokens = query
    .toLowerCase()
    .split(/[\s.]+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const text = `${algo.title.toLowerCase()} ${algo.slug.toLowerCase()}`;
  const id = algo.leetcodeId == null ? null : String(algo.leetcodeId);
  return tokens.every((t) => (/^\d+$/.test(t) ? id != null && id.startsWith(t) : text.includes(t)));
}
