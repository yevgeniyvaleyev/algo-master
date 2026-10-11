// Validates bundled content: schema, theory references, Russian text, and that every
// solutionTs type-checks (with LeetCode's predefined ListNode / TreeNode / _Node classes).
//
//   node scripts/content/validate.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { z } from 'zod';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'data');
const CYRILLIC = /[а-яё]/i;

const base = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  leetcodeId: z.number().int().positive(),
  title: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  group: z.string().min(1),
  leetcodeUrl: z.string().url(),
  conditionMd: z.string().min(20),
});
const generated = z.object({
  descriptionRuMd: z
    .string()
    .min(20)
    .refine((s) => CYRILLIC.test(s), 'must be in Russian'),
  solutionTs: z
    .string()
    .min(20)
    .refine((s) => CYRILLIC.test(s), 'must contain Russian comments'),
  ideaRuMd: z
    .string()
    .min(20)
    .refine((s) => CYRILLIC.test(s), 'must be in Russian'),
  theory: z.object({ topicKey: z.string().regex(/^[a-z0-9-]+$/), titleRu: z.string().min(1) }),
});
const GENERATED_KEYS = Object.keys(generated.shape);
const theorySchema = z.object({
  key: z.string(),
  titleRu: z.string().min(1),
  bodyMd: z
    .string()
    .min(50)
    .refine((s) => CYRILLIC.test(s), 'must be in Russian'),
});

// Classes LeetCode predefines for TypeScript solutions.
const LEETCODE_PRELUDE = `
declare class ListNode { val: number; next: ListNode | null; constructor(val?: number, next?: ListNode | null); }
declare class TreeNode { val: number; left: TreeNode | null; right: TreeNode | null; constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null); }
// One permissive _Node covers every problem's variant (graph, random list, next pointers, quad tree).
declare class _Node {
  val: any; neighbors: _Node[]; next: _Node | null; random: _Node | null; left: _Node | null; right: _Node | null;
  children: _Node[]; isLeaf: boolean; topLeft: _Node | null; topRight: _Node | null; bottomLeft: _Node | null; bottomRight: _Node | null;
  constructor(val?: any, ...rest: any[]);
}
declare class NestedInteger { isInteger(): boolean; getInteger(): number | null; getList(): NestedInteger[]; }
`;

function typecheck(solutions) {
  const files = new Map([['/prelude.d.ts', LEETCODE_PRELUDE]]);
  // Each solution is its own module so top-level names don't collide.
  for (const [slug, code] of solutions) files.set(`/solutions/${slug}.ts`, `${code}\nexport {};\n`);
  const options = {
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2023.d.ts'],
    strict: true,
    noEmit: true,
    noUnusedLocals: false,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (name, lang, ...rest) =>
    files.has(name) ? ts.createSourceFile(name, files.get(name), lang) : getSourceFile.call(host, name, lang, ...rest);
  host.fileExists = (name) => files.has(name) || ts.sys.fileExists(name);
  host.readFile = (name) => files.get(name) ?? ts.sys.readFile(name);
  const program = ts.createProgram([...files.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const where = d.file
      ? `${path.basename(d.file.fileName, '.ts')}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}`
      : '';
    return `${where} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
  });
}

async function main() {
  const errors = [];
  const theoryKeys = new Set();
  for (const f of await fs.readdir(path.join(DATA, 'theory'))) {
    if (!f.endsWith('.json')) continue;
    const json = JSON.parse(await fs.readFile(path.join(DATA, 'theory', f), 'utf8'));
    const res = theorySchema.safeParse(json);
    if (!res.success)
      errors.push(`theory/${f}: ${res.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    if (json.key !== f.slice(0, -5)) errors.push(`theory/${f}: key "${json.key}" does not match file name`);
    theoryKeys.add(json.key);
  }

  const manifest = JSON.parse(await fs.readFile(path.join(DATA, 'manifest.json'), 'utf8'));
  const solutions = new Map();
  let complete = 0;
  for (const { slug } of manifest.algos) {
    const file = path.join(DATA, 'algos', `${slug}.json`);
    let json;
    try {
      json = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      errors.push(`${slug}: missing data/algos/${slug}.json`);
      continue;
    }
    const b = base.safeParse(json);
    if (!b.success) errors.push(`${slug}: ${b.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    const present = GENERATED_KEYS.filter((k) => json[k] !== undefined);
    if (present.length === 0) continue;
    if (present.length < GENERATED_KEYS.length) {
      errors.push(`${slug}: partial content, missing ${GENERATED_KEYS.filter((k) => !present.includes(k)).join(', ')}`);
      continue;
    }
    const g = generated.safeParse(json);
    if (!g.success) {
      errors.push(`${slug}: ${g.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      continue;
    }
    if (!theoryKeys.has(json.theory.topicKey)) errors.push(`${slug}: unknown theory "${json.theory.topicKey}"`);
    solutions.set(slug, json.solutionTs);
    complete++;
  }

  errors.push(...typecheck(solutions));

  console.log(`algos=${manifest.algos.length} withRussianContent=${complete} theory=${theoryKeys.size}`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
