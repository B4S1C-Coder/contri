# Floating widget implementation ledger

Approved scope: public GitHub overlay; session token with optional local saving; progressive overview; sampled PR/issue team metrics; checked issue references; full source public, release gated on installed Chrome verification.

- Baseline: published 835c011 as unfinished development source.
- Authentication/request layer: in progress.
- Floating widget: pending.
- Metrics and issue checks: pending.
- Verification and release: pending. Browser tooling previously blocked chrome://extensions; do not work around that restriction.

Architecture: isolated Shadow DOM content UI, typed service-worker requests, trusted extension settings page for token entry. Public-only metadata check before repository detail requests. API transport remains worker-owned.
