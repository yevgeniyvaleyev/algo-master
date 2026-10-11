/** "88. Merge Sorted Array" — LeetCode problem number + title. */
export function displayTitle(algo: { leetcodeId: number | null; title: string }): string {
  return algo.leetcodeId != null ? `${algo.leetcodeId}. ${algo.title}` : algo.title;
}
