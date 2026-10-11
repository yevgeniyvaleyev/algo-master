# AlgoMaster — implementation plan

## Context
This is a personal Android app for refreshing LeetCode algorithms you have already solved on a laptop. There is no typing of solutions: you read, review and mark the algorithm as learned. The app sets a daily quota (for example 3 algorithms). In the last phase, it will block chosen entertainment apps until the quota is met. Each learned algorithm unlocks N minutes of those apps, and once all daily targets are met, nothing is blocked. The content comes from LeetCode "Top Interview 150". Claude generates the Russian translations, TypeScript solutions with Russian comments, explanations of the idea, and theory notes offline. These are bundled into the app as seed JSON. The repo is currently empty. There is no auth, because the app runs on one phone only.

Decisions already made: **Android only**, **Expo + dev client**, **content generated offline by Claude**, **marks expire after N days (set in Settings) when auto-unmark is on**.

## Stack
- Expo SDK (latest stable) with TypeScript and Expo Router. Bottom tabs: **Dashboard / Algorithms / Settings**. Inside the algorithm screen, top tabs use `expo-router/js-top-tabs` (expo-router bundles its own react-navigation fork).
- `expo-sqlite` (plain SQL in `src/db/repo.ts`, no ORM) for user data: topics, algorithm↔topic links, progress and the learn log.
- Algorithm content comes from bundled JSON in `data/algos/<slug>.json`. It is read-only and not stored in the DB.
- `zustand` for settings and UI state, persisted in SQLite through a settings table.
- `prism-react-renderer` to tokenize code, rendered with RN `<Text>` spans using VS Code Dark+ and Light+ token colors. Line numbers go in the gutter, and long lines scroll horizontally.
- `react-native-markdown-display` for the condition, description, idea and theory text. `react-native-gesture-handler` + `reanimated` handle pinch-zoom.
- Theme: a `system | light | dark` setting. `system` follows `useColorScheme()` and switches automatically.
- Tooling: ESLint, Prettier, `jest-expo` for logic tests and `tsc --noEmit`.

## Data model
- `topics(id, name, sort_order)` supports create, rename and delete. If you delete a topic that still has algorithms, they move to a built-in "Без темы" topic after you confirm.
- `algos(slug PK, title, difficulty easy|medium|hard, topic_id, order, leetcode_url)` is seeded from the manifest. Algorithms can be moved to another topic with a long-press → "Move to topic".
- `progress(slug PK, learned_at)` holds the current "learned" mark. Unmarking deletes the row.
- `learn_log(id, slug, date, ts)` is an append-only history used for stats and the daily quota. If you unmark on the same day you marked, that day's log row is removed so the quota stays honest.
- `settings`: dailyGoal (default 3), minutesPerAlgo (default 30), autoUnmark (bool), expireDays (default 14), theme, blockedPackages[], codeFontSize.
- **Expiration:** when the app starts and when it returns to the foreground, if autoUnmark is on, delete `progress` rows where `learned_at < now - expireDays`.
- **Seeding:** `data/manifest.json` (topics + algorithms + a `seedVersion`) is loaded into the DB on first launch. When `seedVersion` increases, an upsert adds new algorithms and topics without touching user renames or progress.

### Content JSON schema (validated with zod)
```ts
{ slug, title, difficulty, group, leetcodeUrl,
  conditionMd,        // original EN condition, as on LeetCode
  descriptionRuMd,    // Russian translation
  solutionTs,         // TypeScript with inline Russian comments
  ideaRuMd,           // idea of the solution in Russian
  theory: { topicKey, titleRu } } // refers to data/theory/<topicKey>.md (sliding window, greedy, stack, heap…), shared across algorithms
```

## Screens
1. **Dashboard:** today's progress ring (k/dailyGoal), streak (consecutive days the goal was met), totals learned/total, split by difficulty, a 7- and 30-day bar chart from `learn_log`, and the next suggested unlearned algorithms. In phase 5, earned entertainment minutes left today.
2. **Algorithms:** a SectionList grouped by topic. Each header shows `learned/total` (for example `5/10`) and can collapse. Each row shows the title, a colored difficulty badge (Easy/Medium/Hard) and a learned checkmark. Filters: All / Not learned. Topic header menu: rename / delete. A FAB creates a topic.
3. **Algorithm detail** (`app/algo/[slug].tsx`): top tabs **Условие · Описание · Решение · Идея · Теория**. A header button toggles learned / not learned.
   - The Решение tab has the VS Code-style `CodeViewer`. Pinch changes the font size (re-layout, so text stays sharp) within 10–28 pt. +/- buttons are a fallback. The size is saved in settings.
4. **Settings:** theme, daily goal, auto-unmark toggle + expiration days, and (phase 5) minutes per algorithm, blocked apps picker and a button to grant permissions.

## Phases
**0. Scaffold:** `git init`, `git remote add origin https://github.com/yevgeniyvaleyev/algo-master.git`, create the Expo app, lint/test config, and a CLAUDE.md. No commits or pushes without asking you.

**1. Data layer + mock:** SQLite schema and migrations, the seeding service, the progress/quota/expiration/stats logic as pure functions with jest tests, and one hand-written mock algorithm ("Merge Sorted Array") with all 5 content fields plus a theory file for "Two Pointers".

**2. UI:** navigation, the Algorithms list with topic CRUD, the detail screen with tabs, CodeViewer with zoom, and the theme system.

**3. Dashboard + Settings:** stats queries, charts (`react-native-svg`), settings screen and expiration on foreground.

**4. Real data:**
- `scripts/scrape/` uses Playwright (`npx playwright install chromium`). `scrape-plan.ts` opens https://leetcode.com/studyplan/top-interview-150/ and extracts the groups, problem titles, slugs and difficulty → `scripts/out/plan.json`. `scrape-problems.ts` opens each `/problems/<slug>/description/` and turns the condition HTML into markdown (turndown) → `scripts/out/problems/<slug>.json`. It runs with rate limiting and can resume.
- Claude generates the Russian content and TypeScript solutions in batches by group → `data/algos/*.json` + `data/theory/*.md`.
- `scripts/validate-content.ts` checks every file against the zod schema and type-checks every `solutionTs` with `tsc`.
- `scripts/build-manifest.ts` creates `data/manifest.json` with a higher `seedVersion`.

**5. Android app blocking:** a local Expo module `modules/app-blocker` (Kotlin) with a config plugin.
- An `AccessibilityService` watches `TYPE_WINDOW_STATE_CHANGED` to find the foreground package.
- The JS side writes the state to SharedPreferences through the module: blockedPackages, dailyGoal, learnedToday, unlock minutes earned (learnedToday × minutesPerAlgo), and the date.
- The native side tracks time spent in blocked apps today. If the goal is not met and used ≥ earned, it starts a full-screen `BlockActivity` ("Изучи алгоритм") with an "Open AlgoMaster" button. If the goal is met, nothing is blocked. Counters reset at midnight.
- Installed apps picker uses PackageManager (`QUERY_ALL_PACKAGES` is fine for a sideloaded app). There is a permission onboarding flow for Accessibility.
- Release APK for sideloading: `npx expo run:android --variant release` (or EAS local build).

## Verification
- `npx tsc --noEmit`, `npx eslint .`, `npx jest`. Unit tests cover the quota, streak, expiration, unmarking on the same day and seed upsert.
- `npx expo run:android` on an emulator or USB device. Manually check: mark/unmark updates the topic counter and dashboard; topic create/rename/delete; all 5 tabs render; code zoom; light/dark switching automatically with system settings; expiration (set expireDays = 0 and reopen the app).
- Phase 4: the validator passes for all 150 problems, and spot-check a few in the app.
- Phase 5 on a real phone: a blocked app is blocked when 0 are learned; it is usable for 30 min after 1 is learned; it is unblocked after the goal is met; everything resets the next day.
