# CONTRI privacy and permissions

CONTRI is a public GitHub companion with no backend or analytics. Its floating widget runs only on github.com. It reads the repository path currently displayed to retrieve public evidence; it does not persist tab URLs or browsing history.

Public API requests go to api.github.com. GitHub receives ordinary request metadata, including your IP address. Requests omit browser cookies. Optional tokens are sent to GitHub in the Authorization header by the background worker only.

## Optional GitHub token

Enter a token only in the extension-owned Settings page. Session storage is the default and is cleared when the browser closes. **Remember on this device** retains the token in extension-local storage until you disconnect or uninstall. This storage is not an encrypted password vault. Token storage is restricted to trusted extension contexts; page content scripts receive only public reports and connection status, never the token.

Disconnect removes the token. Revoke a token in GitHub settings if you want to invalidate it at GitHub as well. Only public repositories are supported, even if a token has broader permissions. No write permissions are needed.

## Local data

Up to 100 public result sections are cached for 15 minutes. Incomplete sections are not retained as fresh reports. Clear cached reports in Settings to remove report data. Widget position is stored locally. Uninstalling removes extension storage. Fonts and icons are bundled.

Permissions: `storage` retains local settings and reports; `scripting` and `activeTab` allow toolbar recovery on GitHub; host permissions are github.com for the widget and api.github.com for public requests. No all-sites access is requested.

The launch website is static, has no analytics, does not accept tokens, and uses explicitly fictional demo numbers.

## Shortlist and AI handoff

Only projects and issues you explicitly save enter the local shortlist (up to 50 items), along with notes you choose to write. This is separate from automatic report caching. Remove saved items in My shortlist; uninstalling clears all extension data.

Contribution briefs are assembled locally from public issue metadata, evidence links, and any completed checks. CONTRI does not call an AI API or read AI chat accounts. Clicking Copy brief places the previewed text on your clipboard. Opening ChatGPT, Claude, or Grok opens that provider's homepage without putting the brief in its URL. If you paste it there, the provider processes it under its own terms and privacy policy. No AI subscription, token, or password is collected by CONTRI.

CONTRI does not sell user data, use it for advertising or credit decisions, or transfer it beyond the disclosed functionality. Contact the developer through https://github.com/alphasafal/contri/issues for privacy questions without posting credentials or sensitive content.
