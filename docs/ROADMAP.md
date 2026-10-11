# AlgoMaster — roadmap

A personal Android app for refreshing LeetCode "Top Interview 150" algorithms. You read the material and mark an algorithm as learned; there is no code input. A daily goal drives stats and reminders, and (phase 5) gates entertainment apps: each learned algorithm unlocks N minutes, and meeting the goal unblocks everything. There is no auth or backend, and the UI is in Russian.

Decisions: **Android only**, **Expo + dev client**, **content generated offline by Claude**, **marks optionally expire after N days**.

Architecture and commands are in [`CLAUDE.md`](../CLAUDE.md).

## Done

**0–3. App**
- Expo SDK 57 + Expo Router. Bottom tabs: Прогресс / Алгоритмы / Настройки.
- Algorithm screen tabs: Условие · Описание · Идея · Решение · Теория.
- SQLite with migrations; the manifest is seeded and upserted by `seedVersion`.
- The learn log drives the daily goal, the streak, and the 7/30-day chart.
- The «По сложности» card shows Easy, Medium and Hard plus a «Всего» total.
- Topics can be created, renamed and deleted, and algorithms moved between them. Marks are changed in bulk mode on the list or from the algorithm screen.
- Auto-unmark after N days.
- The code viewer has VS Code-style highlighting and pinch or +/- zoom.
- Custom pasted solutions are formatted with prettier.
- Light/dark theme, automatic or manual.

**4. Content**
- The scraper uses LeetCode GraphQL through the Playwright request API, because the HTML pages are behind a Cloudflare check.
- All 150 problems have Russian content: description, TypeScript solution with Russian comments, idea, and one of 25 theory notes.
- Content is generated in batch modules (`scripts/content/generated/*.mjs`). Every solution runs against the LeetCode examples plus edge cases before it's merged.
- `content:validate` checks the schema, the Russian text, and runs tsc on every solution.
- All 87 problem images are bundled for offline use (`content:images`).

**Extras**
- Suggestions: topics take turns, each giving its easiest unlearned algorithm, starting after the most recently learned topic.
- Reminders: local notifications every N hours within a time window while the daily goal isn't met, planned 7 days ahead. They need an installed build, not Expo Go.

## Next

**A. Own APK (EAS cloud build)**
- `eas.json` with a `preview` profile that builds an APK, plus a white notification icon.
- `npx eas-cli@latest build -p android --profile preview`, then install from the link or QR code.

**B. Phase 5 — Android app blocking.** A local Expo module `modules/app-blocker` (Kotlin) with a config plugin.
- An `AccessibilityService` watches `TYPE_WINDOW_STATE_CHANGED` to find the foreground package.
- The JS side writes state to SharedPreferences through the module: blockedPackages, dailyGoal, learnedToday, unlock minutes earned (learnedToday × minutesPerAlgo), and the date.
- The native side tracks time spent in blocked apps today. If the goal isn't met and used ≥ earned, it starts a full-screen `BlockActivity` («Изучи алгоритм») with an «Открыть AlgoMaster» button. Counters reset at midnight.
- The installed-apps picker uses PackageManager (`QUERY_ALL_PACKAGES` is fine for a sideloaded app). There is a permission onboarding flow for Accessibility.
- The dashboard shows the entertainment minutes left today.

## Verification
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content:validate`; re-running every batch with `apply.mjs` is a full content regression check.
- On the phone:
  - Marking and unmarking update the counters and the dashboard.
  - Topic CRUD works, all 5 tabs render, and code zoom works.
  - The theme follows the system setting.
  - Expiration works: set expireDays = 0 and reopen the app.
  - Reminders: set the window to the current hour.
- Phase 5:
  - With 0 learned, a blocked app is blocked.
  - After 1 learned, it's usable for 30 minutes.
  - After the goal is met, it's unblocked.
  - Everything resets the next day.
