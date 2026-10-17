# Security policy

## Supported versions

Security fixes go into the latest release. Please update before reporting.

| Version | Supported |
| ------- | --------- |
| 0.3.x   | ✅        |
| < 0.3   | ❌        |

## Reporting a vulnerability

Please report privately through [GitHub security advisories](https://github.com/alphasafal/contri/security/advisories/new). Do not open a public issue, and never include real tokens. You can expect an acknowledgement within a few days and a fix or mitigation plan as soon as the issue is confirmed.

If you exposed a GitHub token, revoke it right away at https://github.com/settings/personal-access-tokens or https://github.com/settings/applications.

## Security model

- Public repositories only; private cross-references are filtered out.
- The sign-in token is held by the service worker in storage restricted to trusted extension contexts. Scripts on GitHub pages never receive it, and it is only sent to `api.github.com`. It is kept in one place: in memory for the browser session, or, with “Stay signed in”, encrypted at rest with AES-GCM under a non-extractable Web Crypto key.
- Links rendered from API data must be `https:` URLs; anything else is shown as text.
- Every message from a GitHub page is validated against an allow-list; credential operations are accepted only from the extension's own Settings page.
- No remote code, no `eval`, no analytics, no backend. On-device AI output is rendered as plain text and treated as untrusted.
- Encryption at rest keeps the token out of plain text (token scanners, casual disclosure). The key is stored in the same browser profile, so it does not protect a full profile copy or against someone who controls your computer. “Stay signed in” is opt-in.
- CI runs CodeQL, `npm audit` for production dependencies, and a package check that rejects remote code, source maps and credential-like strings in the release ZIP.
