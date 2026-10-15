# Contributor Compass Implementation Plan

> **For agentic workers:** Implement this plan task by task and verify each deliverable before release.

**Goal:** Ship a public, buildable Chrome extension that helps contributors assess public GitHub repositories with transparent evidence.

**Architecture:** A Manifest V3 service worker opens a React side panel. The panel fetches public GitHub REST data through a cache-aware client; pure metrics functions turn API results into labeled evidence. No backend or login is required.

**Tech Stack:** TypeScript, React, Vite, Vitest, Chrome Manifest V3.

**Spec:** Approved plan in the conversation, including the selected visual reference.

## Tasks

- [ ] Scaffold the extension and permission-minimal manifest; verify a build loads in Chrome.
- [ ] Implement a bounded GitHub client, repository analysis, response sampling, issue discovery, community readiness, and cache/error states; unit test calculations and failures.
- [ ] Build the responsive side panel from the selected visual language with original texture, a data-driven chart, search, repository details, evidence, and issue links; verify keyboard and narrow layouts.
- [ ] Add documentation, privacy statement, contribution files, release packaging, and meaningful tests.
- [ ] Run fresh tests, build, package inspection, live API spot checks, and Chrome visual review. Create and push the public GitHub repository only after these gates pass.

## Review Focus

- GitHub rate limiting: show a dated cached result or explicit retry state.
- Bot-heavy data: exclude known bots from activity and response counts.
- Small response samples: show insufficient evidence rather than a confident verdict.
- Search scope: disclose candidate count and ranking limits.
- Archived or forked repositories: show the state without implying active contribution opportunities.
