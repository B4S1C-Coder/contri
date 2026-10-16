# Release acceptance

Record results and browser/build version in VERIFICATION.md. Do not equate a source test or website demo with installed-extension evidence.

## Automated

- [ ] Clean npm ci, npm test, npm run package
- [ ] npm audit; review any findings
- [ ] ZIP manifest at root; no credentials, source maps, caches or unrelated files
- [ ] CI green on exact release commit

## Installed Chrome

- [ ] Load current dist; no service worker or content errors
- [ ] Auto-detection, SPA navigation, back/forward, quick repository switching
- [ ] No duplicate widget; drag, keyboard movement, reset, close, toolbar reopen
- [ ] Minimize/restore; narrow viewport; light and dark GitHub; reduced motion
- [ ] Public active/quiet/archived/fork repositories; private rejection
- [ ] Live sample and source links agree for several public repositories
- [ ] Issue references open/draft/closed/merged; incomplete checks never clear
- [ ] Actual discussion timestamps and coverage disclosure
- [ ] Brief preview/copy/provider opening; no automatic AI transmission
- [ ] Save note, remove item, compare; persistence after restart
- [ ] Anonymous, invalid/expired token, valid token, disconnect, session expiry, optional persistence
- [ ] Rate limit, partial failure, retry recovery, remaining capacity
- [ ] Keyboard focus, scrolling and readable contrast

## Publication

- [ ] Confirm listing matches shipped behavior and required privacy categories
- [ ] Add authentic installed screenshots and required promotional tile
- [ ] Upload ZIP and checksum as a versioned release after acceptance
- [ ] Complete developer registration and submit for review
- [ ] Replace beta/install CTA with the actual Store URL only once approved
