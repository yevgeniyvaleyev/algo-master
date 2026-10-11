import { formatTs, normalizePasted } from '../format-code';

describe('normalizePasted', () => {
  it('strips CRLF, nbsp and zero-width chars', () => {
    expect(normalizePasted('\n\nlet a = 1;​\r\nlet b = 2;  \n\n')).toBe('let a = 1;\nlet b = 2;');
  });
});

describe('formatTs', () => {
  it('re-indents and normalizes pasted code', async () => {
    const pasted =
      'function twoSum(nums: number[], target: number): number[] {\nconst seen = new Map<number,number>()\n  for (let i=0;i<nums.length;i++){\n        const need = target-nums[i]\nif (seen.has(need)) return [seen.get(need)!, i]\n    seen.set(nums[i],i)\n}\nreturn []\n}';
    const result = await formatTs(pasted);
    expect(result.ok).toBe(true);
    expect(result.code).toBe(
      [
        'function twoSum(nums: number[], target: number): number[] {',
        '  const seen = new Map<number, number>();',
        '  for (let i = 0; i < nums.length; i++) {',
        '    const need = target - nums[i];',
        '    if (seen.has(need)) return [seen.get(need)!, i];',
        '    seen.set(nums[i], i);',
        '  }',
        '  return [];',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('keeps Russian comments', async () => {
    const result = await formatTs('// Идём с конца\nlet x=1');
    expect(result.code).toBe('// Идём с конца\nlet x = 1;\n');
  });

  it('reports syntax errors and returns the normalized input', async () => {
    const result = await formatTs('function ( {');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    expect(result.code).toBe('function ( {\n');
  });
});
