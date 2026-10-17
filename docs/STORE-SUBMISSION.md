# Chrome Web Store submission kit

## Status

The code-side checks pass on the release build (see [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md)). The remaining steps happen in the Chrome Web Store Developer Dashboard and can only be done by the publisher. Google reviews every submission; nothing in this file is an approval or a compliance certification.

**Upload this file:** `contri-v<version>.zip` from the GitHub release (not the `-firefox` zip, not "Source code"). `manifest.json` is at its root and `npm run verify:package` checks it.

## 1. Name

CONTRI — Open Source Compass

## 2. Short description (132 characters max; this is 116)

Know if a GitHub issue is really free before you start: claims, linked PRs, maintainer replies and project activity.

## 3. Full description

Know whether a GitHub issue is actually available before you spend hours on it.

CONTRI adds a small, quiet companion to GitHub that answers the questions every contributor has:

• Can I work on this issue? A badge under the issue title shows whether it looks free, is assigned, was claimed in the comments (or the claim went quiet), or already has a pull request.
• Will someone reply? How quickly the project team answers outside contributors, and who actually maintains the project, including members GitHub labels as "contributors".
• Is this project alive? Merged pull requests and commits over 90 days, human authors, a weekly chart and the latest release.

Also included: projects matched to the languages you use, a private shortlist with notes, watched issues with notifications, and thread summaries with Chrome's built-in on-device AI.

Honest by design: every number says what it covers, sampled results are labelled, and missing data is shown as unknown, never as zero. CONTRI is a guide, not a guarantee: always say hello in the thread before you start.

Private and open source: no backend, no analytics, no ads. Works anonymously within GitHub's limits; optional sign-in with GitHub (read-only, no scopes) raises the limit. Public repositories only. MIT licensed: https://github.com/alphasafal/contri

## 4. Single purpose

Help people decide where and how to contribute to public GitHub projects, using public evidence about issue availability, maintainer responses and project activity.

## 5. Permission justifications

- **storage:** Saves preferences, cached public reports, the user's shortlist and watched issues, and the optional GitHub sign-in. A remembered sign-in is encrypted; all extension storage is restricted to trusted extension contexts.
- **scripting:** Shows CONTRI when the toolbar button is clicked on a GitHub tab that was already open before installation (content scripts are not injected into existing tabs automatically).
- **alarms:** Checks the user's watched issues about once an hour.
- **notifications:** Tells the user when a watched issue changes, for example it was unassigned or got a pull request. Can be turned off in Settings.
- **Host permission https://github.com/\*:** Shows the launcher and the badges on GitHub pages, and uses GitHub's device-flow sign-in endpoints.
- **Host permission https://api.github.com/\*:** Reads public repository, issue and pull request data from the GitHub API. The optional token is sent only here.
- **Remote code:** None. All JavaScript, styles and fonts are in the package. On-device AI uses Chrome's built-in model.

## 6. Data-use declarations (Privacy practices tab)

Answer from what the code does (summarised in [PRIVACY.md](../PRIVACY.md)). Recommended, conservative answers:

| Dashboard category                                     | Declare? | Why                                                                                                                                                 |
| ------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication information                             | Yes      | Optional GitHub token, stored on the device and sent only to api.github.com.                                                                        |
| Web history                                            | Yes      | The repository and issue in the current github.com URL are sent to api.github.com to fetch evidence. Nothing else is read and no history is stored. |
| Website content                                        | Yes      | Public issue text, comments and repository data are read from GitHub and processed on the device (including by Chrome's on-device AI).              |
| Personally identifiable information                    | No       | CONTRI does not ask for name, email or address. Public GitHub usernames appear in public data it displays.                                          |
| Personal communications                                | No       | No email, chat or messages are read.                                                                                                                |
| Location, health, financial and payment, user activity | No       | Not collected. No clicks, keystrokes or mouse movement are recorded.                                                                                |

Certify all three Limited Use statements (no sale, no use unrelated to the single purpose, no creditworthiness or lending use). The required affirmative statement is published in PRIVACY.md under **Limited Use**.

## 7. Privacy policy URL

https://github.com/alphasafal/contri/blob/main/PRIVACY.md

## 8. Support URL

https://github.com/alphasafal/contri/issues

## 9. Homepage URL

https://contri-two.vercel.app

## 10. Reviewer instructions (paste into "Test instructions")

No account or credentials are needed; everything works anonymously.

1. Install. A welcome page opens; signing in is optional. Close it.
2. Open https://github.com/pallets/flask. A small round button appears at the bottom right; click it to open the Overview (activity, merged PRs, chart).
3. Open any open issue of that repository. A "contri." badge appears under the title; click "Can I work on this?" to check availability, then click the badge again for the details.
4. In the panel: Team → "Analyze team responses" (about 25 GitHub requests in anonymous mode). Issues → filter presets. Discover → search a keyword such as "documentation".
5. On an issue's details: Watch and Save, then "Saved & watched".
6. Gear icon → Settings: sign-in options, badge and launcher preferences, clear cached data.
7. Escape minimizes the panel; the toolbar button toggles it.

Anonymous mode has GitHub's limit of 60 requests per hour. If a limit message appears, wait for the time shown or sign in.

## Store graphics

| Asset                   | Size                    | Source                                                                                                           |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Icon                    | 128×128 PNG, in the ZIP | `public/icon-128.png`                                                                                            |
| Small promotional image | 440×280                 | `docs/store/promo-small-440x280.png`                                                                             |
| Screenshots (1–5)       | 1280×800                | `docs/store/screenshot-*.png`, captured from the installed extension on a mock GitHub with labelled example data |
| Marquee (optional)      | 1400×560                | `docs/store/promo-marquee-1400x560.png`                                                                          |

Screenshots show the real installed UI, but on the test mock of GitHub with example data (`acme/widgets`), because the build environment cannot reach github.com. They are accurate about the interface; do not describe their numbers as real project statistics. Better, and recommended before a public launch: replace them with captures on real GitHub. Install the release ZIP, open a real repository and issue, set the browser window so the page is 1280×800, and take the same four views (issue availability, Overview, Team, dark mode).

## Account steps (publisher only)

1. Register the developer account, pay the one-time fee if required, and complete identity and contact verification.
2. Turn on 2-Step Verification for the publishing Google account.
3. Add the item, upload the ZIP, fill sections 1–10, upload the graphics.
4. Complete the Privacy practices tab exactly as in section 6, and the Limited Use certification.
5. Choose visibility (Public or Unlisted for a soft launch) and regions, then submit for review.

## Official references checked 17 October 2026

- Program policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- 2026 policy updates (enforced from 1 August 2026): https://developer.chrome.com/blog/cws-policy-updates-2026
- Limited Use: https://developer.chrome.com/docs/webstore/program-policies/limited-use/
- User data FAQ (privacy policy, local data, encryption at rest): https://developer.chrome.com/docs/webstore/user_data/
- Images: https://developer.chrome.com/docs/webstore/images
