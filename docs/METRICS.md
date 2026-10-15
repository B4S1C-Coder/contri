# Metric definitions and limitations

The observation window is the 90 days preceding report generation. Thirteen chart bins cover that period: twelve seven-day bins and a final six-day bin. Human merged PRs use `merged_at`; authors are distinct case-insensitive PR author logins. Commits require a linked GitHub author and an author timestamp in the window. Known bot accounts and bot-suffixed names are excluded; unknown authors cannot reliably be counted as humans.

The API retrieves at most 100 recently updated PRs, 100 commits, and 100 recently updated open issues. A full page is flagged as a potentially truncated sample and displayed as a lower bound. A quiet sample does not prove repository inactivity. Failed endpoints display unavailable evidence, not zero.

Response analysis samples up to five recent non-draft outside-contributor PRs with a known public author association. For each PR, up to 100 conversation comments, submitted reviews, and inline review comments are inspected. Team association means OWNER, MEMBER, or COLLABORATOR at the time GitHub labels that item. Bots and author self-replies are excluded. First reply is the earliest eligible response timestamp after PR creation. The median uses responding PRs only, not unanswered PRs. Fewer than three sampled PRs is insufficient evidence for a response pattern. Truncated histories and failed endpoints are disclosed; failed samples are not counted as unanswered.

Discovery compares at most five recently updated public non-fork, non-archived search candidates. Ranking uses sampled human merged PRs, then distinct authors, then linked human commits. This is not a ranking of all GitHub. Candidates with unavailable metrics are not assigned an evidence ranking.

Issues must be open, unlocked, not PRs, and labeled `good first issue` or `help wanted`. No assignee does not prove availability: check linked PRs and discussion. Community-profile file presence does not prove a welcoming project. Fork profiles can be unavailable.

Rate limits and permission failures are distinct states. A small request reserve is retained; samples may shrink when capacity is low. Repeated reads use the cache. Archived and disabled repository states are explicit.
