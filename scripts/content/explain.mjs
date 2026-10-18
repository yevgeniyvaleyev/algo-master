// Merges a batch of detailed Russian walkthroughs («Разбор» tab) into data/algos/<slug>.json as `explanationRuMd`.
//
//   node scripts/content/explain.mjs scripts/content/explanations/<batch>
//
// A batch is a folder of `<slug>.md` files (plain Markdown, so code needs no escaping).
//
// Every ```ts fence must be an exact excerpt of that algorithm's solutionTs (whitespace-insensitive), so the walkthrough
// quotes the code the «Решение» tab shows; illustrative code that isn't from the solution is fenced as ```ts naive.
// A fence that doesn't match is reported as a warning; errors (missing algorithm, too short, not Russian) exit 1.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'data');
const MIN_LENGTH = 1500;

// Same order as apply.mjs / sync.mjs.
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
  'explanationRuMd',
  'theory',
];

const squash = (s) => s.replace(/\s+/g, '');

/** ```ts fences (not `ts naive`) whose code isn't part of the solution. */
function strayExcerpts(md, solution) {
  const whole = squash(solution);
  const stray = [];
  for (const m of md.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)) {
    const info = m[1].trim().split(/\s+/);
    if (!['ts', 'typescript'].includes(info[0]) || info.includes('naive')) continue;
    if (!whole.includes(squash(m[2]))) stray.push(m[2].trim().split('\n')[0]);
  }
  return stray;
}

async function main() {
  const batch = process.argv[2];
  if (!batch) {
    console.error('usage: node scripts/content/explain.mjs <batch folder>');
    process.exit(1);
  }
  const dir = path.resolve(batch);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  const explanations = Object.fromEntries(
    await Promise.all(files.map(async (f) => [f.slice(0, -3), await fs.readFile(path.join(dir, f), 'utf8')])),
  );
  let errors = 0;
  let warnings = 0;
  for (const [slug, raw] of Object.entries(explanations)) {
    const file = path.join(DATA, 'algos', `${slug}.json`);
    let existing;
    try {
      existing = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      console.error(`ERROR   ${slug}: no data/algos/${slug}.json`);
      errors++;
      continue;
    }
    const md = raw.trim();
    if (md.length < MIN_LENGTH || !/[а-яё]/i.test(md)) {
      console.error(`ERROR   ${slug}: needs ≥ ${MIN_LENGTH} chars of Russian text (has ${md.length})`);
      errors++;
      continue;
    }
    for (const line of strayExcerpts(md, existing.solutionTs ?? '')) {
      console.warn(`WARN    ${slug}: \`\`\`ts block is not in solutionTs: ${line}`);
      warnings++;
    }
    const merged = { ...existing, explanationRuMd: md };
    const ordered = Object.fromEntries(ALGO_KEYS.filter((k) => merged[k] !== undefined).map((k) => [k, merged[k]]));
    await fs.writeFile(file, JSON.stringify(ordered, null, 2) + '\n');
    console.log(`ok      ${slug} (${md.length} chars)`);
  }
  if (warnings) console.warn(`${warnings} warning(s)`);
  if (errors) {
    console.error(`${errors} error(s); nothing written for them.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
