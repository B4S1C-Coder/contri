# Contributing to CONTRI

Thanks for helping make open source easier to join. Small, focused pull requests are the easiest to review.

## Before you start

- Look for an existing issue, or open one describing the contributor problem and how to reproduce it.
- Comment that you'd like to work on it. (CONTRI itself will show maintainers and other contributors that you claimed it.)

## Set up

1. Fork and clone the repository. Use Node.js 24 (`.nvmrc`).
2. `npm ci`
3. `npm run build`, then load `dist` with **Load unpacked** in `chrome://extensions`.
4. “Sign in with GitHub” works out of the box with the CONTRI OAuth App; see the README to use your own.

## Before opening a pull request

```sh
npm run check        # Prettier, ESLint, unit tests, build
npm run test:e2e     # installed-extension tests (needs `npx playwright install chromium` once)
```

Then try the flow you changed in a real Chrome profile on a real repository.

## Guidelines

- **Keep calculations pure.** Put logic in `src/core/` with unit tests; reports in `src/background/reports/` only fetch and normalize.
- **Support both paths.** If you change a report, update both the REST (anonymous) and GraphQL (signed-in) functions and their tests in `tests/unit/reports.test.ts`.
- **Never show unavailable evidence as zero.** Use `null` and a warning.
- **Respect the request budget.** Anonymous users have 60 requests per hour. Note the cost of new requests in your PR.
- **Keep the CONTRI glass look.** Reuse the existing classes and colors in `src/content/widget.css`; both light and dark variants should look like the same product.
- **Accessibility:** keyboard access, visible focus, readable contrast, reduced motion.
- **Privacy:** no analytics, no new hosts, no remote code. Never commit tokens or personal data, and never put a token in screenshots or logs.

## Pull request description

Say what changed and why, what you verified (commands, browsers, repositories), and any limitations. The template will prompt you.
