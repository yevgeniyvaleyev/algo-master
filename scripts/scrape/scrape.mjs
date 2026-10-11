// Scrapes the LeetCode "Top Interview 150" study plan via LeetCode's public GraphQL API,
// using Playwright's request context (the HTML pages sit behind a Cloudflare bot check).
//
//   node scripts/scrape/scrape.mjs            # plan + all problems (resumable)
//   node scripts/scrape/scrape.mjs --plan     # only the plan
//   node scripts/scrape/scrape.mjs --force    # re-fetch problems that already exist
//   node scripts/scrape/scrape.mjs --md-only  # rebuild conditionMd from the saved conditionHtml (no network)
//
// Output: scripts/out/plan.json, scripts/out/problems/<slug>.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { request } from 'playwright';
import TurndownService from 'turndown';

const PLAN_SLUG = 'top-interview-150';
const DELAY_MS = 800;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../out');

const args = new Set(process.argv.slice(2));

const PLAN_QUERY = `query studyPlan($slug: String!) {
  studyPlanV2Detail(planSlug: $slug) {
    slug name
    planSubGroups { slug name questions { titleSlug title difficulty questionFrontendId paidOnly } }
  }
}`;

const QUESTION_QUERY = `query question($slug: String!) {
  question(titleSlug: $slug) {
    questionFrontendId title titleSlug difficulty isPaidOnly content
    topicTags { name slug }
    hints
    codeSnippets { langSlug code }
  }
}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(api, query, variables, referer) {
  for (let attempt = 1; ; attempt++) {
    const res = await api.post('https://leetcode.com/graphql', {
      data: { query, variables },
      headers: { 'Content-Type': 'application/json', Referer: referer },
    });
    if (res.ok()) {
      const json = await res.json();
      if (json.errors) throw new Error(JSON.stringify(json.errors));
      return json.data;
    }
    if (attempt >= 4) throw new Error(`HTTP ${res.status()} for ${JSON.stringify(variables)}`);
    const wait = DELAY_MS * 2 ** attempt;
    console.warn(`  HTTP ${res.status()}, retrying in ${wait}ms`);
    await sleep(wait);
  }
}

function makeTurndown() {
  const td = new TurndownService({ codeBlockStyle: 'fenced', headingStyle: 'atx', bulletListMarker: '-' });
  // 10<sup>9</sup> -> 10^9
  td.addRule('sup', { filter: 'sup', replacement: (content) => `^${content}` });
  td.addRule('sub', { filter: 'sub', replacement: (content) => `_${content}` });
  // LeetCode wraps examples in <pre> without <code>; keep them as plain fenced blocks
  // (keeping 1<sup>2</sup> as 1^2, which plain textContent would flatten to 12).
  const preText = (node) =>
    [...node.childNodes]
      .map((c) => {
        if (c.nodeType === 3) return c.nodeValue;
        if (c.nodeName === 'SUP') return `^${preText(c)}`;
        if (c.nodeName === 'SUB') return `_${preText(c)}`;
        return preText(c);
      })
      .join('');
  td.addRule('pre', {
    filter: 'pre',
    replacement: (_content, node) => `\n\n\`\`\`\n${preText(node).replace(/\n+$/, '')}\n\`\`\`\n\n`,
  });
  return td;
}

const toMarkdown = (td, html) => td.turndown(html).replace(/\u00a0/g, ' ').trim();

async function rebuildMarkdown() {
  const td = makeTurndown();
  const dir = path.join(OUT, 'problems');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  let changed = 0;
  for (const f of files) {
    const json = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
    const md = toMarkdown(td, json.conditionHtml);
    if (md === json.conditionMd) continue;
    await fs.writeFile(path.join(dir, f), JSON.stringify({ ...json, conditionMd: md }, null, 2));
    changed++;
    console.log(`  rebuilt ${json.slug}`);
  }
  console.log(`Done. ${changed}/${files.length} conditions changed.`);
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function exists(file) {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

async function main() {
  if (args.has('--md-only')) return rebuildMarkdown();
  await fs.mkdir(path.join(OUT, 'problems'), { recursive: true });
  const api = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (algo-master personal study app)' },
  });

  console.log(`Fetching study plan ${PLAN_SLUG}…`);
  const { studyPlanV2Detail: plan } = await gql(
    api,
    PLAN_QUERY,
    { slug: PLAN_SLUG },
    `https://leetcode.com/studyplan/${PLAN_SLUG}/`,
  );
  const groups = plan.planSubGroups.map((g, gi) => ({
    key: slugify(g.name),
    name: g.name,
    order: gi,
    questions: g.questions.map((q, qi) => ({
      slug: q.titleSlug,
      title: q.title,
      difficulty: q.difficulty.toLowerCase(),
      frontendId: q.questionFrontendId,
      paidOnly: q.paidOnly,
      order: qi,
    })),
  }));
  await fs.writeFile(
    path.join(OUT, 'plan.json'),
    JSON.stringify({ slug: plan.slug, name: plan.name, groups }, null, 2),
  );
  const total = groups.reduce((n, g) => n + g.questions.length, 0);
  console.log(`  ${groups.length} groups, ${total} problems -> scripts/out/plan.json`);
  if (args.has('--plan')) return api.dispose();

  const td = makeTurndown();
  let done = 0;
  let skipped = 0;
  const failed = [];
  for (const group of groups) {
    for (const q of group.questions) {
      done++;
      const file = path.join(OUT, 'problems', `${q.slug}.json`);
      if (!args.has('--force') && (await exists(file))) {
        skipped++;
        continue;
      }
      try {
        const { question } = await gql(
          api,
          QUESTION_QUERY,
          { slug: q.slug },
          `https://leetcode.com/problems/${q.slug}/`,
        );
        if (!question?.content) throw new Error('empty content (paid-only?)');
        const ts = question.codeSnippets?.find((s) => s.langSlug === 'typescript')?.code ?? null;
        await fs.writeFile(
          file,
          JSON.stringify(
            {
              slug: q.slug,
              frontendId: question.questionFrontendId,
              title: question.title,
              difficulty: q.difficulty,
              group: group.name,
              groupKey: group.key,
              order: q.order,
              leetcodeUrl: `https://leetcode.com/problems/${q.slug}/`,
              topicTags: question.topicTags.map((t) => t.slug),
              hints: question.hints,
              tsSnippet: ts,
              conditionHtml: question.content,
              conditionMd: toMarkdown(td, question.content),
            },
            null,
            2,
          ),
        );
        console.log(`  [${done}/${total}] ${q.slug}`);
      } catch (e) {
        failed.push(q.slug);
        console.error(`  [${done}/${total}] ${q.slug} FAILED: ${e.message}`);
      }
      await sleep(DELAY_MS);
    }
  }
  await api.dispose();
  console.log(`Done. fetched=${total - skipped - failed.length} skipped=${skipped} failed=${failed.length}`);
  if (failed.length) {
    console.log('Failed:', failed.join(', '));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
