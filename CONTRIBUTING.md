# Contributing

Start with an issue explaining the contributor problem and a reproducible example. Small focused pull requests are welcome.

1. Fork and clone the full repository.
2. Use Node.js 24 and run `npm ci`.
3. Run `npm test` and `npm run build`.
4. Load `dist` unpacked in Chrome and test the affected flow.
5. Include evidence of behavior and describe limitations in your PR.

Keep data calculations separate from presentation. Never replace unavailable evidence with zero. Add fixtures for changed metric behavior. Check narrow panels, keyboard access, reduced motion, anonymous API limits, and public-only permissions. Never commit tokens, local caches, personal configuration, or fabricated live metrics.

UI-only previews cannot verify Chrome permissions or tab-following behavior. Report which checks you actually performed.
