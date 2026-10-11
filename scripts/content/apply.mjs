// Merges a batch of generated Russian content into data/algos/*.json and data/theory/*.json,
// after running every solution against its example tests.
//
//   node scripts/content/apply.mjs scripts/content/generated/<batch>.mjs
//
// A batch module exports:
//   theory: [{ key, titleRu, bodyMd }]
//   algos:  { [slug]: { descriptionRuMd, solutionTs, ideaRuMd, theory: { topicKey, titleRu },
//                       fn: 'functionName', tests: [{ args: [...], expected, inPlace?: argIndex, sortResult?,
//                                                    argTypes?: [...], resultType? }] } }
//
// sortResult ignores order at EVERY nesting level (inner arrays are sorted too), so don't use it when the order
// inside an element matters (e.g. permutations) — normalize in a harness instead.
//
// argTypes[i] / resultType convert LeetCode-style JSON to and from linked structures:
//   'list'      [1,2,3]               <-> ListNode chain
//   'tree'      [3,9,20,null,null,15]  <-> TreeNode (level order, trailing nulls trimmed)
//   'cycleList' [[3,2,0,-4], 1]        -> ListNode chain whose tail points to index 1 (-1 = no cycle)
//
// Optional per-algorithm fields for problems the above can't express:
//   prelude: 'JS source'   injected BEFORE the solution (e.g. LeetCode's `class _Node {...}` for that problem)
//   harness: 'JS source'   defines `function __run(...args)` that builds inputs, calls the solution and returns a
//                          JSON-comparable result (normalize order there if the answer may be in any order).
//                          When present, tests call __run instead of fn.
//   cls: 'ClassName'       design problems, tested in LeetCode's format instead of fn:
//                          tests: [{ ops: ['MinStack','push','getMin'], args: [[],[-2],[]], expected: [null,null,-2] }]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'data');

const ALGO_KEYS = [
  'slug',
  'leetcodeId',
  'title',
  'difficulty',
  'group',
  'leetcodeUrl',
  'conditionMd',
  'descriptionRuMd',
  'solutionTs',
  'ideaRuMd',
  'theory',
];

const PRELUDE = `
class ListNode { constructor(val, next) { this.val = val ?? 0; this.next = next ?? null; } }
class TreeNode { constructor(val, left, right) { this.val = val ?? 0; this.left = left ?? null; this.right = right ?? null; } }
`;

const PRELUDE_JS = `
${PRELUDE}
function __toList(arr) { let head = null; for (let i = arr.length - 1; i >= 0; i--) head = new ListNode(arr[i], head); return head; }
function __fromList(head) { const out = []; for (let n = head, i = 0; n && i < 10000; n = n.next, i++) out.push(n.val); return out; }
function __toCycleList([arr, pos]) {
  const head = __toList(arr); if (pos < 0) return head;
  let tail = head, target = null;
  for (let i = 0; tail; i++) { if (i === pos) target = tail; if (!tail.next) break; tail = tail.next; }
  tail.next = target; return head;
}
function __toTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]); const queue = [root]; let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) queue.push((node.left = new TreeNode(arr[i])));
    i++;
    if (i < arr.length && arr[i] !== null) queue.push((node.right = new TreeNode(arr[i])));
    i++;
  }
  return root;
}
function __fromTree(root) {
  const out = []; const queue = [root];
  while (queue.length) { const n = queue.shift(); if (n) { out.push(n.val); queue.push(n.left, n.right); } else out.push(null); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
globalThis.__convertIn = (type, v) => type === 'list' ? __toList(v) : type === 'tree' ? __toTree(v) : type === 'cycleList' ? __toCycleList(v) : v;
globalThis.__convertOut = (type, v) => type === 'list' ? __fromList(v) : type === 'tree' ? __fromTree(v) : v;
`;

const canonical = (v) =>
  Array.isArray(v) ? v.map(canonical).map((x) => JSON.stringify(x)).sort() : v;

function runTests(slug, { solutionTs, fn, cls, prelude = '', harness, tests = [] }) {
  if ((!fn && !cls && !harness) || tests.length === 0) throw new Error(`${slug}: no tests`);
  const js = ts.transpileModule(solutionTs, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ console });
  const entry = harness ? `${harness}\n;globalThis.__fn = __run;` : cls ? `globalThis.__cls = ${cls};` : `globalThis.__fn = ${fn};`;
  vm.runInContext(`${PRELUDE_JS}\n${prelude}\n${js}\n;${entry}`, context, { timeout: 2000 });
  const solve = cls
    ? (ops, opArgs) => {
        const obj = new context.__cls(...opArgs[0]);
        return [null, ...ops.slice(1).map((op, k) => obj[op](...opArgs[k + 1]) ?? null)];
      }
    : context.__fn;
  tests.forEach((t, i) => {
    const args = cls
      ? [t.ops, structuredClone(t.args)]
      : structuredClone(t.args).map((a, j) => context.__convertIn(t.argTypes?.[j], a));
    const result = context.__convertOut(t.resultType, solve(...args));
    // In-place checks compare the mutated argument, converted back like a result would be.
    const actual = t.inPlace !== undefined ? context.__convertOut(t.argTypes?.[t.inPlace], args[t.inPlace]) : result;
    const norm = (v) => JSON.parse(JSON.stringify(v));
    try {
      if (t.sortResult) assert.deepEqual(canonical(norm(actual)), canonical(t.expected));
      else assert.deepEqual(norm(actual), t.expected);
    } catch {
      throw new Error(
        `${slug}: test #${i + 1} failed: expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(actual)}`,
      );
    }
  });
  return tests.length;
}

async function main() {
  const batchPath = process.argv[2];
  if (!batchPath) throw new Error('usage: apply.mjs <batch.mjs>');
  const batch = await import(pathToFileURL(path.resolve(batchPath)).href);

  for (const t of batch.theory ?? []) {
    await fs.writeFile(path.join(DATA, 'theory', `${t.key}.json`), JSON.stringify(t, null, 2) + '\n');
    console.log(`theory  ${t.key}`);
  }

  let failed = 0;
  for (const [slug, gen] of Object.entries(batch.algos ?? {})) {
    const file = path.join(DATA, 'algos', `${slug}.json`);
    const existing = JSON.parse(await fs.readFile(file, 'utf8'));
    let passed;
    try {
      passed = runTests(slug, gen);
    } catch (e) {
      failed++;
      console.error(`FAIL    ${e.message}`);
      continue;
    }
    const merged = {
      ...existing,
      descriptionRuMd: gen.descriptionRuMd.trim(),
      solutionTs: gen.solutionTs.trim() + '\n',
      ideaRuMd: gen.ideaRuMd.trim(),
      theory: gen.theory,
    };
    const ordered = Object.fromEntries(ALGO_KEYS.filter((k) => merged[k] !== undefined).map((k) => [k, merged[k]]));
    await fs.writeFile(file, JSON.stringify(ordered, null, 2) + '\n');
    console.log(`ok      ${slug} (${passed} tests)`);
  }
  if (failed) {
    console.error(`${failed} algorithm(s) failed; nothing written for them.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
