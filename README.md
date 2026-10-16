# CONTRI

A free, open-source glass widget for contributors on GitHub. Understand repository activity, inspect observed team responses, and find useful issues before investing your time.

**Development build:** the source and build are available; installed Chrome verification is pending. This is not a Chrome Web Store release.

## Build and install

Use Node.js 24 and Chrome 124 or newer.

```sh
npm ci
npm test
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist`. Open or reload a public GitHub repository. When updating a development build, click Reload on the extension card and reload the GitHub tab.

A 360 × 460 px widget follows the repository. Drag its handle or use arrow keys while the handle is focused. Minimize to a 44 px launcher. Close hides it for the tab; the extension toolbar icon restores it. Use Reset position if needed. The widget is constrained to the viewport and never takes over a side panel.

## What it shows

- **Overview:** repository context, last push, 90-day sampled human merges, distinct PR authors, linked human commits, open issue/PR counts, latest release, and source-linked activity.
- **Team:** up to 20 recent outside-contributor PRs and 20 issues, separate response coverage, average and median first reply, unanswered waiting ages, and observed team responders. Load this deeper analysis when needed.
- **Issues:** direct issue search, beginner and experienced presets, labels and assignment, and public timeline checks for referenced open/draft/closed/merged PRs.
- **Explore:** compare up to five public repositories by sampled recent activity.
- **Contribution guide:** detected README, license, contribution guide, conduct policy, and templates.

Numbers are evidence, not predictions. A cross-reference does not prove a PR implements an issue; no linked open PR found does not prove nobody has begun work. Public associations are not a complete maintainer roster. See [metric definitions](docs/METRICS.md).

## Optional token

Choose **Connect GitHub** in the widget. Settings walks you through creating a fine-grained token with public repository access and no extra write permissions. A token increases request capacity, but GitHub still applies limits. Default storage lasts for the browser session; optional local remembering and Disconnect are provided. Never paste a token into the website, an issue, or a screenshot. See [privacy](PRIVACY.md).

## Development and checks

`npm run dev` previews layout only. The installed extension is needed for Chrome APIs and live data.

`npm test` runs offline fixtures. `CONTRI_LIVE=1 npm test -- tests/live.test.ts` runs an optional public API smoke check and consumes anonymous GitHub request capacity.

`npm run package` produces the extension ZIP and checksum. Release publication is gated on installed Chrome checks. Current evidence and limitations are in [verification](docs/VERIFICATION.md).

The buildless launch website lives in `website/dist`. Preview it with `python3 -m http.server 4174 --directory website/dist`. Demo data is explicitly fictional and isolated from live extension views.

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md). Full source is MIT licensed. Small improvements to accessibility, metrics, fixtures, and documentation are welcome. Original code patterns from the user-supplied maintainerPulse archive are documented in [the review](docs/maintainer-pulse-review.md).

## Prepare your contribution

Use **Prepare my contribution** on an issue to preview a source-linked brief and checklist. Copy it into your preferred AI chat for explanation, investigation planning, or a PR checklist. No data is sent automatically and no AI login is collected. Chat subscription limits still apply; direct API integration is not included.

Save projects or issues to **My shortlist**, add local notes, and compare up to three projects. Saved items stay in your Chrome profile and can be removed individually.

## Launch materials

[Store submission guide](docs/STORE-SUBMISSION.md) · [Release checklist](docs/RELEASE-CHECKLIST.md) · [Privacy policy](PRIVACY.md) · [License](LICENSE)
