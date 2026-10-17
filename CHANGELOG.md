# Changelog

## 0.3.0 — contributor co-pilot

**New**

- Badges inside GitHub: next to issue titles (“Looks free”, “Claimed by @x”, “Claim went quiet”, “Open PR #n”, “Assigned”) and in the repository About box.
- Claim detection: finds “I'd like to work on this” comments, respects people who give an issue back, and flags claims with no activity for 21+ days.
- Linked pull requests now include GitHub's Development panel and closing keywords (signed in).
- On-device AI with Chrome's built-in Gemini Nano: thread summary and “How do I start?”. Nothing is uploaded.
- Discover: projects matched to the languages you use, ranked by recent human merges and good-first-issues.
- Watched issues with hourly checks and notifications.
- Sign in with GitHub (OAuth device flow, no backend, no scopes).
- Dark variant of the CONTRI glass theme that follows GitHub's appearance.
- Welcome page on install; preferences for launcher behavior and badges.
- Experimental Firefox package.

**Better evidence**

- Maintainers are identified from triage and merge activity, CODEOWNERS and the repository owner, not only GitHub's team badge (which hides private organization members).
- Exact merged-PR count for 90 days from GitHub search, excluding common bots.
- One GraphQL query per report when signed in (team analysis: ~80 requests → 2–3).
- Partial reports are cached for a shorter time instead of never.

**Lighter and calmer**

- Starts as a small launcher instead of opening on every repository.
- `widget.js` 366 KB → ~85 KB: Preact runtime, inline icons, fonts loaded from the package instead of inlined (they never rendered inside the shadow root).
- Navigation detection uses Turbo and Navigation API events instead of watching the whole page.
- Requests run two at a time; back-off survives worker restarts.

**Brand**

- The contri. symbol (arrow in a circle) and wordmark across the toolbar icon, launcher, widget, badges and settings; website link in the extension details and Settings.

**Project**

- Code split into `core`, `background`, `content`, `settings` with ESLint and Prettier.
- 65 unit tests and 8 installed-extension end-to-end tests in Chromium against a mock GitHub, run in CI.
- CI, CodeQL, Dependabot and a tag-driven release workflow; README link checking.
- Up to date: Preact 11, ESLint 10 (React hooks rules v7), Playwright 1.64, TypeScript types and GitHub Actions v7.

## 0.2.0 — release candidate

- Rebrand to CONTRI; compact movable glass widget; session-default GitHub connection; team-response evidence; referenced-PR checks; contribution briefs; local shortlist; launch website.
