# Contributor Compass

A free Chrome side panel for finding useful work in public GitHub repositories. A sea-glass widget with an original atmospheric background, readable evidence, and a subtle interactive grid.

## Run locally

Use Node.js 24 and Chrome 114 or newer.

```sh
npm ci
npm test
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist`. Click the extension toolbar icon while viewing a GitHub repository.

The panel follows the active GitHub repository, including navigation to issues and pull requests. **Pause** keeps the current report. Entering a repository or choosing a discovery result switches to manual exploration; **Follow tab** resumes detection. No browsing history is stored. Public API results may be cached for 15 minutes; following a tab does not bypass that cache.

For a browser-only UI preview, run `npm run dev`. Automatic tab detection requires the installed extension.

## Five features

- **Overview:** 90-day human merge activity, distinct PR authors, and commits with linked human GitHub accounts.
- **Team response:** sampled public conversation replies, reviews, and inline comments from owner/member/collaborator accounts. Inspect source evidence.
- **Discovery:** compare up to five recently updated search candidates by sampled human merges, authors, and linked commits.
- **Issue opportunities:** recently updated open good-first-issue and help-wanted issues, including assignment and discussion information.
- **Readiness:** links to detected project documentation. Read the project's own requirements before contributing.

Counts are bounded samples, not exhaustive totals. No score promises acceptance or a welcoming community. See [metric definitions](docs/METRICS.md) and [privacy](PRIVACY.md).

## Glass interactions

A local grid and luminous dot follow the pointer. Touch adds a soft ring. The decorative layer never intercepts clicks, selection, or scrolling. Effects are disabled for reduced motion and forced colors. The glass blends with the extension's original background; Chrome does not expose the underlying website through its side panel.

## Package and contribute

`npm run package` builds a loadable ZIP and SHA-256 checksum. Publish the full source repository, with the ZIP attached to a versioned release. See [contribution instructions](CONTRIBUTING.md). Chrome Web Store publication is a separate reviewed submission; it has not been completed.

## Current verification

Automated metric and API error tests and production build pass. The glass UI has been inspected in a browser preview. Installed Chrome side-panel navigation and complete live-repository verification remain release gates; this source is a development build.
