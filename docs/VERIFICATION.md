# CONTRI 0.2.0 release-candidate verification — 16 October 2026

## Verified in this pass

- 20 offline tests pass across seven files; three live checks are opt-in and skipped in the normal suite.
- TypeScript and both Vite bundles build.
- Dependency audit reports zero vulnerabilities at check time.
- Final fresh code review found three shortlist note/concurrency bugs; all were fixed. A regression test exercises concurrent saves/removal and repeated bookmarking.
- Website: Team demo switching, mobile navigation, desktop rendering and 390px layout inspected. No horizontal overflow at 390px. No website console errors observed.
- Website published successfully at https://contri.realironmansafal033.chatgpt.site. Access remains owner-private.
- Earlier public API smoke checks passed for pallets/flask, alphasafal/contributor-compass (renamed to contri), and jquery/jquery-mobile. These are not installed-browser proof and do not verify every endpoint or metric.

## Required before public release / Store submission

Installed Chrome acceptance remains pending. Browser control detected a Chrome profile but timed out opening GitHub; no successful installed-widget, token, drag, SPA navigation, or restart test is claimed for this final build. Use RELEASE-CHECKLIST.md to finish and record results. A ZIP supplied now is a release candidate for local testing, not a certified final release.

A checklist and source review cannot guarantee Google approval. Store screenshots must show the actual installed build, not the website's illustrative widget. Privacy disclosures must be reviewed against the current dashboard.

## Provenance

Wafer's homepage informed atmosphere and interaction patterns. CONTRI uses original copy and generated atmosphere, not Wafer assets, testimonials or logos. Website demo numbers are explicitly fictional and never used in live extension reports.

## Final delivery checks

- Packaged archive verification passes: 23 files, manifest at root, expected MV3 permissions, no preview entrypoints or dynamic code, and duplicate-host bundle startup.
- GitHub Actions passed for bd83d615af6a34cf15de3e967a18571fbdb39462: https://github.com/alphasafal/contri/actions/runs/38902033611.
- Additional homepage polish: slow tide movement, buoyant dots/rings, drifting mist, pointer light and touch ripples. Ambient pause/play verified in local browser; reduced-motion CSS disables decorative animations. Versioned asset URLs avoid stale browser assets.
