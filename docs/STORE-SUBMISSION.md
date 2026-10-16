# Chrome Web Store submission kit

## Status

Release candidate. Do not submit until every installed-browser gate in RELEASE-CHECKLIST.md is recorded as passed. Google reviews submissions; this checklist is not approval or a compliance certification.

## Listing text

**Name:** CONTRI — Open Source Compass

**Summary:** Explore public GitHub repositories with clear evidence about activity and contribution opportunities.

**Single purpose:** Help contributors evaluate public GitHub projects and prepare useful contributions using repository activity, sampled project-team responses, issue references and contribution guidance.

**Description:**

CONTRI is a compact, movable glass widget on GitHub. See sampled 90-day activity, separate issue and pull-request counts, observed human and team activity, and source-linked response evidence. Find issues by label and assignment, inspect public references to existing pull requests, and read contribution documents before starting.

Save a local shortlist with notes and compare up to three projects. Prepare a contribution brief, review it, and optionally copy it into your preferred AI chat. CONTRI does not send briefs to an AI service or access your chat account.

Works anonymously within GitHub API limits. An optional public-read GitHub token increases capacity; session-only storage is the default. No backend, analytics, ads, or private repository analysis. Samples may be incomplete. No linked open PR found does not guarantee that an issue has no work underway.

## Dashboard URLs

- Homepage/source: https://github.com/alphasafal/contri
- Support: https://github.com/alphasafal/contri/issues
- Privacy: https://github.com/alphasafal/contri/blob/main/PRIVACY.md

Use a verified published website URL only after deployment. Do not put localhost in the dashboard.

## Permission explanations

- storage: cache public reports, retain widget position, explicitly saved shortlist/notes, and optional token. Token storage is restricted to trusted extension contexts.
- scripting and activeTab: restore the widget when the user clicks the toolbar button on GitHub.
- https://github.com/*: show the widget and detect the repository path as the user navigates GitHub.
- https://api.github.com/*: retrieve public repository evidence; an optional token is sent only to GitHub.
- No remote code. All executable JavaScript and fonts are bundled. GitHub responses are data.

## Privacy disclosure review

Do not blindly select “no user data.” The extension handles an optional authentication token, current GitHub repository path, public repository content and user-written local notes. Review the dashboard's current category descriptions and accurately disclose applicable authentication information, web history/website content and user-provided content processing. Explain local-only storage and direct GitHub transmission. There is no developer backend collecting this information, no sale, advertising, unrelated profiling or credit use. Copying a brief is user initiated; opening a provider does not transfer the brief.

Keep listing, permission justifications, dashboard disclosures and PRIVACY.md consistent. The developer must complete Limited Use certifications truthfully.

## Reviewer instructions

1. Load/install the extension, open https://github.com/pallets/flask and click the toolbar icon if needed.
2. Overview works without an account or token, subject to public API limits.
3. Team is on demand and may consume many requests; partial/insufficient states are intentional.
4. Issues → Check for existing PRs inspects public references and discussion.
5. Prepare my contribution previews plain text; Copy brief is explicit. Provider links only open their homepages.
6. Save a project → My shortlist → write/save/remove a note.
7. Settings → optional GitHub token setup. Do not provide a developer's personal token in reviewer notes.

## Artwork and account steps

Capture actual installed UI at 1280×800 or 640×400 (at least one screenshot); no fictional stats presented as live. Supply the 128px icon and a 440×280 small promotional tile. Additional artwork is optional according to the current dashboard. Complete developer account registration, required contact/identity verification and security settings. Upload the ZIP with manifest.json at its root. Review all declarations, then submit for Google's review.

## Official references checked 16 October 2026

- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/publish
