# CONTRI privacy and permissions

CONTRI has no backend and no analytics. It reads public GitHub data from your browser and keeps everything else on your device.

## What it reads

The extension runs on github.com. It reads the repository and issue number in the current page's URL to fetch public evidence from `api.github.com`. It does not store your browsing history. GitHub receives ordinary request metadata (such as your IP address); requests never include your GitHub cookies.

Only public repositories are analyzed, even if your sign-in could see more. Private cross-references are filtered out.

## Signing in

- **Sign in with GitHub (device flow):** you approve a code on github.com. CONTRI receives a token with no scopes (public, read-only access) directly from GitHub. Your password never touches CONTRI.
- **Personal access token:** entered only on the extension's own Settings page.

By default the token is kept in session storage and forgotten when the browser closes. “Stay signed in” keeps it in extension-local storage until you sign out or uninstall; this is not an encrypted vault. Both storage areas are restricted to trusted extension contexts, so scripts running on GitHub pages cannot read the token. It is sent only to `api.github.com`. Sign out in Settings, and revoke access at https://github.com/settings/applications (OAuth) or https://github.com/settings/personal-access-tokens (tokens).

## On-device AI

“Summarize the thread” and “How do I start?” use Chrome's built-in model (Gemini Nano), which runs locally. The issue text is processed on your device and is not sent to CONTRI or to an AI service. Chrome may download the model once; that download is managed by Chrome. Nothing runs until you click.

## Stored on your device

- Cached public reports (up to 80, expiring after 10 minutes to 24 hours) and maintainer rosters (7 days). Clear them in Settings.
- Your shortlist and notes (up to 50 items), and watched issues (up to 10).
- Preferences and widget position.

Uninstalling removes all of it.

## Notifications

If you watch an issue, CONTRI checks it about once an hour and shows a system notification when something useful changes. Turn notifications off in Settings, or stop watching.

## Permissions

| Permission                 | Why                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `storage`                  | preferences, cached reports, shortlist, watched issues, optional sign-in           |
| `scripting`                | show CONTRI when the toolbar button is clicked on a tab opened before installation |
| `alarms`                   | hourly checks of watched issues                                                    |
| `notifications`            | tell you when a watched issue changes                                              |
| `https://github.com/*`     | show the launcher and badges; also used for the device-flow sign-in endpoints      |
| `https://api.github.com/*` | read public repository evidence                                                    |

No all-sites access. No remote code: all JavaScript and fonts ship in the package.

## AI chat handoff

The contribution brief is assembled locally. **Copy brief** puts it on your clipboard; the ChatGPT, Claude and Gemini links open those sites without the brief. If you paste it there, that provider's terms apply.

CONTRI does not sell data, use it for advertising or credit decisions, or transfer it beyond what is described here. Questions: https://github.com/alphasafal/contri/issues (never post tokens or personal data).
