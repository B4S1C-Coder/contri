# Chrome Web Store submission kit

## Status

Ready for submission once the manual checks in RELEASE-CHECKLIST.md pass on the release build. Automated installed-extension tests run in CI. Google reviews submissions; this checklist is not approval or a compliance certification.

## Listing text

**Name:** CONTRI — Open Source Compass

**Summary (132 chars max):** Find open-source issues you can actually take: project activity, team reply times, claims and linked PRs, right on GitHub.

**Single purpose:** Help people decide where and how to contribute to public GitHub projects, using public evidence about project activity, maintainer responses and issue availability.

**Description:**

CONTRI answers the questions every open-source contributor has, right on GitHub:

• Is this project alive? Exact merged-PR counts, human authors, commits and a 90-day chart.
• Will someone reply? How quickly maintainers answer outside contributors, and who the maintainers really are.
• Can I work on this issue? A badge next to every issue title shows whether it looks free, is assigned, was claimed in the comments (or the claim went quiet), or already has a pull request.

Also: projects matched to the languages you use, a private shortlist with notes, watched issues with notifications, and on-device AI thread summaries using Chrome's built-in model (nothing is uploaded).

Works anonymously within GitHub's limits; optional sign-in with GitHub (read-only, no scopes) raises the limit. No backend, no analytics, no ads, public repositories only. Evidence can be incomplete and CONTRI says so.

## Dashboard URLs

- Homepage/source: https://github.com/alphasafal/contri
- Support: https://github.com/alphasafal/contri/issues
- Privacy: https://github.com/alphasafal/contri/blob/main/PRIVACY.md

Use a verified published website URL only after deployment. Do not put localhost in the dashboard.

## Permission explanations

- **storage:** preferences, cached public reports, the user's shortlist and watched issues, and the optional sign-in token (restricted to trusted extension contexts).
- **scripting:** show CONTRI when the toolbar button is clicked on a GitHub tab opened before installation.
- **alarms:** check watched issues about once an hour.
- **notifications:** tell the user when a watched issue changes (can be turned off).
- **https://github.com/\*:** show the launcher and badges as the user navigates GitHub; device-flow sign-in endpoints.
- **https://api.github.com/\*:** read public repository evidence; the optional token is sent only here.
- No remote code. All JavaScript and fonts are bundled; on-device AI uses Chrome's built-in model.

## Privacy disclosure review

Do not blindly select “no user data.” The extension handles an optional authentication token, the current GitHub repository path, public repository content, user-written local notes and watched-issue URLs. On-device AI processes public issue text locally. Review the dashboard's current category descriptions and accurately disclose applicable authentication information, web history/website content and user-provided content processing. Explain local-only storage and direct GitHub transmission. There is no developer backend collecting this information, no sale, advertising, unrelated profiling or credit use. Copying a brief is user initiated; opening a provider does not transfer the brief.

Keep listing, permission justifications, dashboard disclosures and PRIVACY.md consistent. The developer must complete Limited Use certifications truthfully.

## Reviewer instructions

1. Install the extension. A welcome page opens; signing in is optional.
2. Open https://github.com/pallets/flask. A small compass button appears at the bottom right; click it for the Overview.
3. Open any issue, e.g. from the repository's Issues tab. A CONTRI badge appears under the title; click **Can I work on this?** to check availability, then click the badge again for details.
4. Team → **Analyze team responses** (anonymous mode uses about 25 GitHub requests).
5. Issues → **First contribution** preset; Discover → search a keyword.
6. On an issue's details: **Watch** and **Save**; then **Saved & watched**.
7. Settings (gear icon) → sign-in options and preferences. Do not use a developer's personal token in reviewer notes.

## Artwork and account steps

Capture actual installed UI at 1280×800 or 640×400 (at least one screenshot); no fictional stats presented as live. Supply the 128px icon and a 440×280 small promotional tile. Additional artwork is optional according to the current dashboard. Complete developer account registration, required contact/identity verification and security settings. Upload the ZIP with manifest.json at its root. Review all declarations, then submit for Google's review.

## Official references checked 16 October 2026

- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/publish
