import { matchesQuery } from '../search';

const merge = { leetcodeId: 88, title: 'Merge Sorted Array', slug: 'merge-sorted-array' };
const twoSum = { leetcodeId: 1, title: 'Two Sum', slug: 'two-sum' };
const noId = { leetcodeId: null, title: 'Mock Algo', slug: 'mock-algo' };

describe('matchesQuery', () => {
  it('matches everything for an empty query', () => {
    expect(matchesQuery(merge, '')).toBe(true);
    expect(matchesQuery(merge, '   ')).toBe(true);
  });

  it('matches LeetCode numbers by prefix', () => {
    expect(matchesQuery(merge, '88')).toBe(true);
    expect(matchesQuery(merge, '8')).toBe(true);
    expect(matchesQuery(merge, '89')).toBe(false);
    expect(matchesQuery(twoSum, '1')).toBe(true);
    expect(matchesQuery(merge, '88.')).toBe(true);
  });

  it('matches title words in any order, case-insensitively', () => {
    expect(matchesQuery(merge, 'merge')).toBe(true);
    expect(matchesQuery(merge, 'ARRAY sor')).toBe(true);
    expect(matchesQuery(merge, 'merge list')).toBe(false);
  });

  it('matches the slug', () => {
    expect(matchesQuery(twoSum, 'two-sum')).toBe(true);
  });

  it('combines number and words', () => {
    expect(matchesQuery(merge, '88. merge')).toBe(true);
    expect(matchesQuery(merge, '1 merge')).toBe(false);
  });

  it('never matches a number when the algorithm has none', () => {
    expect(matchesQuery(noId, '1')).toBe(false);
    expect(matchesQuery(noId, 'mock')).toBe(true);
  });
});
