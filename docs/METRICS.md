# Metric definitions

## Overview

The observation window is the 90 days preceding collection. Thirteen chart bins cover twelve seven-day periods and a final six-day period. Merges use `merged_at`; authors are distinct case-insensitive PR-author logins. Commits require a linked GitHub author and author timestamp in the window. Known bots and bot-suffixed accounts are excluded. Unknown authors are excluded, not assumed human.

Up to 100 recently updated PRs and 100 commits are inspected. A full page indicates possible truncation; ≥ denotes a lower bound. A quiet sample does not prove inactivity. Errors are unavailable, not zero. Repository last push is GitHub's `pushed_at`, which may include automation. Open issue and PR counts are separate GitHub search counts. Latest published release uses the releases endpoint; no release is not an error. Median merge time uses sampled human PRs merged within the window and requires three merged items for a headline timing.

## Team responses

Up to 20 outside-contributor PRs and 20 issues created within the past 90 days are selected from up to 100 newest search candidates per type. Draft PRs, bots, and unknown associations are excluded. Eligible outside associations: NONE, FIRST_TIMER, FIRST_TIME_CONTRIBUTOR, CONTRIBUTOR.

For each item, up to 300 conversation comments are inspected. PRs additionally inspect up to 300 submitted reviews and 300 inline review comments. Failed or truncated histories are excluded from response denominators and timing calculations. At exactly 300 items, completion is conservatively unknown.

Team replies require OWNER, MEMBER, or COLLABORATOR association, a human account, and a timestamp at or after item creation and not in the future. Author self-replies are excluded from response metrics. First response is the earliest qualifying reply across inspected histories. Mean and median use answered items only. Unanswered complete histories are shown with current waiting age, never as zero-hour answers. Fewer than three answered items yields insufficient timing evidence. Issue and PR statistics remain separate.

Observed responders and last activity are repository-specific samples, not a complete maintainer roster or online status. Team activity may include a team member's self-comment even though it does not qualify as a response to an outside author.

## Issue opportunities

Open unlocked issues can be filtered by labels, assignment and search. Updated time is not necessarily discussion time. On-demand checks inspect public timeline references (up to 300 events), retrieve referenced PR states, and distinguish draft/open/closed/merged. A cross-reference can be unrelated. No linked open PR found is not proof of availability. Missing or failed references and truncated timelines never produce a clear result.

The same check reads up to 300 issue comments for the last observed human discussion and team-comment count. Its independent coverage flag discloses unavailable/truncated discussion. Team comments are association-labeled human comments, including a team author's own comment; they are participation evidence, not response times. With a truncated history the latest inspected comment may not be the latest actual comment.

## Discovery and comparison

Explore ranks up to five returned public, non-fork, non-archived candidates by sampled merges, authors, then commits. It is not a ranking of all GitHub. Shortlist comparison displays evidence for up to three explicitly selected projects without declaring a winner.

## Freshness and interpretation

Complete public sections may be cached for 15 minutes. Report timestamps show collection time. Partial sections can be retried; Refresh or connection changes invalidate cached reports. A v4 schema separates new report shapes from old caches. Contribution briefs are local text assembled from displayed issue metadata and optional checks. No AI inference is used to calculate any metric.
