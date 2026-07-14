# Changelog media plan: pr-316

## landing-contribution-graph-product-updates

- Decision: 1 visual
- Rationale: The entry's core claim is the week hover detail with code-change totals and product-update links. One tightly framed desktop screenshot of an open hover card proves that better than repeating the full graph from the immutable weekly-graph entry.
- Primary/card asset: `landing-contribution-graph-product-updates.png` — `landing-contribution-graph-hover` scene with a week hover card open showing commits, line totals, and product-update links.
- Additional assets: none
- Omitted candidates:
  - Full open-source section overview — already covered by `landing-weekly-contribution-graph` and would not show the new linking behavior.
  - Mobile month sheet — useful but redundant with the desktop hover evidence for the same claim; one asset is enough.

## landing-ai-coach-demo

- Decision: 1 visual
- Rationale: The staged animation is the story. A single screenshot after the demo reaches an insight card shows the new interaction pattern without needing video of an otherwise looping preview.
- Primary/card asset: `landing-ai-coach-demo.png` — `landing-ai-journaling-demo` scene scrolled to `#ai-journaling` with a visible insight card.
- Additional assets: none
- Omitted candidates:
  - Video of the full typewriter loop — decorative repetition of a static insight-card state.
  - Thinking/skeleton-only frame — weaker evidence than the finished insight card.

## dxfeed-token-persistence-fix

- Decision: 0 visuals
- Rationale: The fix changes token expiry logic and reconnect frequency. There is no new screen layout or control; a screenshot of a "Valid" badge would not demonstrate the behavioral improvement.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - DxFeed connection accordion — unchanged visually; would not prove longer-lived sessions.

## Immutability check

- No published MDX or pr-288/pr-298 assets are modified.
- New assets land only under `public/updates/pr-316/{en,fr}/`.
