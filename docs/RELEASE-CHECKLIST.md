# Release checklist

## Automated (CI does these on every push)

- [ ] `npm run check` — Prettier, ESLint, unit tests, build
- [ ] `npm run test:e2e` — installed extension in Chromium against the mock GitHub
- [ ] `npm run package && npm run verify:package` — permissions, files, size, no dynamic code
- [ ] CodeQL clean

## Manual, in a real Chrome profile

- [ ] Fresh install opens the welcome page; sign in with GitHub (device flow) and with a token; sign out
- [ ] Launcher on repository pages; widget opens, drags, minimizes, resets; toolbar button toggles it
- [ ] Issue badge on a real issue in light and dark GitHub themes; repository About badge
- [ ] SPA navigation: repository → issues → issue → back; no duplicate widgets
- [ ] Team analysis on an active and a quiet repository; archived and fork notes
- [ ] Issues: “First contribution” preset, bulk linked-PR check when signed in, per-issue checks anonymously
- [ ] On-device AI on a Chrome with built-in AI; fallback text elsewhere
- [ ] Watch an issue; notification after a change (use a test repository)
- [ ] Rate-limit message when anonymous capacity runs out

## Publish

1. Update `version` in `package.json` and `public/manifest.json`, and add a `CHANGELOG.md` entry at the top.
2. Merge to `main`, then tag: `git tag v0.3.0 && git push origin v0.3.0`.
3. The Release workflow builds the Chrome and Firefox packages and publishes a GitHub Release with the changelog entry. Set the repository variable `CONTRI_GITHUB_CLIENT_ID` first if the release should offer “Sign in with GitHub”.
4. Upload the Chrome ZIP to the Chrome Web Store (see [STORE-SUBMISSION.md](STORE-SUBMISSION.md)).
