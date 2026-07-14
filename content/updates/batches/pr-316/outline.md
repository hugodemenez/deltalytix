# Changelog outline: pr-316

## Decision

Document the user-facing delta between `main` and `beta` for promotion PR #316. Earlier beta releases already have published changelog entries on `main`; this batch covers only the commits that still change product behavior after those entries landed.

## Coverage

- Included: `ae54d0d0` / PR #310 — contribution graph now links shipped product updates and shows code-change totals → `landing-contribution-graph-product-updates`
- Included: `ca2ad0cd` / PR #311 — staged AI coach demo on the landing page → `landing-ai-coach-demo`
- Included: `05f6e0a7` / PR #312 — DxFeed connections stop expiring on a guessed 12-hour TTL → `dxfeed-token-persistence-fix`
- Covered: `c7146f07` landing redesign → `landing-page-redesign` (immutable)
- Covered: `0d9e9c5d` landing chart carousel → `landing-performance-chart-carousel` (immutable)
- Covered: `83862c67` landing navbar → `landing-navbar-features-and-updates` (immutable)
- Covered: `37975f5f` FAQ and pricing polish → `landing-page-faq-and-pricing-polish` (immutable)
- Covered: `15bbc4a6` billing mobile layout → `billing-payment-history-mobile-layout` (immutable)
- Covered: `6756afeb` calendar timezone grid → `calendar-grid-day-keys-timezone-fix` (immutable)
- Covered: `ac2c8f09` initial weekly contribution graph → `landing-weekly-contribution-graph` (immutable)
- Covered: dashboard AI coach product capability → `ai-trading-coach-journaling` (immutable; different surface from the landing demo)
- Covered: earlier DxFeed reliability work → `dxfeed-sync-reliability-and-pnl` (immutable)
- Skipped: `491d4f84` / PR #313 — minor preview-canvas alignment; no distinct user story.
- Skipped: `426ce88f` / PR #308 — single-line mobile headline spacing tweak.
- Skipped: `a8c66bdd` / PR #307 — Safari mobile menu chrome correction; environment-specific.
- Skipped: `a002453d` / PR #305 — narrow dark-mode safe-area strip fix.
- Skipped: `77cdb604` / PR #306 and `7cbc688c` / PR #309 — admin announcement email tooling only.
- Skipped: `a2650ad0` / PR #303 and `fc00d888` / PR #304 — internal changelog workflow and agent skills.
- Skipped: merge-only commits and ancestry already published on `main`.

## Entry: landing-contribution-graph-product-updates

- User outcome: Visitors can see what shipped in a given week directly from the open-source activity graph, with lines added/deleted when GitHub code-frequency data is available.
- Audience: Prospective users, contributors, and visitors reading the **Open and Transparent** section on the public homepage.
- Surfaces: `/{locale}` → **Open and Transparent** contribution graph; desktop week hover cards; mobile month sheets with **Code changes**, **Lines added**, **Lines deleted**, and **Product updates** links to `/{locale}/updates/{slug}`.
- Dates: 2026-07-14 → 2026-07-14
- Grouping rationale: PR #310 is one cohesive enhancement to the existing contribution graph—data source, hover detail, mobile month drill-down, and changelog linking ship together.
- Important details: Code-frequency totals come from GitHub and fail soft when unavailable. Completed changelog posts are loaded to populate week/month product-update links. This is a follow-up to the weekly graph entry; do not edit that published post.
- Try it: Link to the localized homepage open-source section anchor.

### Story options

- Lead with the new ability to jump from development activity to shipped product updates.
- Pair the changelog links with the optional lines-added/deleted totals as supporting detail.

### Visual moments

- Desktop graph with a week hover card open, showing commit count, line totals, and at least one product-update link.
- Mobile month sheet open with code-change summary and product-update links.

### Visual caveats

- Hover state requires a week with commits and, ideally, a linked changelog entry in that date range.
- Mobile sheet needs touch viewport capture.
- Do not recapture or replace pr-288 contribution-graph assets tied to the original entry.

## Entry: landing-ai-coach-demo

- User outcome: The **AI-Powered Journaling** feature preview on the homepage now demonstrates how the in-product coach answers questions, surfaces metrics, and highlights behavioral insights.
- Audience: Prospective traders visiting the public homepage feature list.
- Surfaces: `/{locale}` → feature **01 AI-Powered Journaling** (`#ai-journaling`) staged chat demo with suggested questions, typing animation, thinking state, streamed response, and insight cards such as **Overall Win Rate** / **Revenge Trading Impact**.
- Dates: 2026-07-14 → 2026-07-14
- Grouping rationale: PR #311 reworks the entire landing demo interaction as one story; it is not the same as the dashboard AI coach product entry.
- Important details: Demo is illustrative marketing copy, not live user data. It respects reduced-motion preferences. Mention the reset control only if it helps readers understand the looping preview.
- Try it: Link to the localized homepage features section.

### Story options

- Show how the landing page now previews the coach conversation flow instead of a static screenshot.
- Emphasize the insight cards as the clearest proof of what traders get from journaling with AI.

### Visual moments

- Demo mid-cycle with a user question, assistant response, and at least one insight card visible.

### Visual caveats

- The demo animates on a timer; capture after waiting for `.coach-insight` or equivalent visible state.
- English and French copy differ; capture both locales separately.

## Entry: dxfeed-token-persistence-fix

- User outcome: DxFeed connections stay connected for Volumetrica's real token lifetime instead of prompting reconnects every day because of a locally guessed expiry.
- Audience: Prop-firm traders using **DxFeed / Volumetrica** sync under **Import → DxFeed**.
- Surfaces: DxFeed connection cards, token status badge, **Reconnect** prompts, and automatic sync eligibility.
- Dates: 2026-07-14 → 2026-07-14
- Grouping rationale: Auth endpoint alignment, provider expiry persistence, and sync gating are one reliability fix with a single user-visible outcome.
- Important details: New connections use the documented v2 auth response and store provider-supplied expiration. Existing opaque-token rows ignore previously guessed timestamps and remain active until DxFeed actually rejects them. JWT expiry and explicit 401/403 invalidation still mark a connection expired.
- Try it: Link to import/sync settings where users manage DxFeed connections.

### Story options

- Lead with fewer unnecessary reconnect prompts, then briefly explain that expiry now follows the provider instead of a guessed TTL.

### Visual moments

- None — the change is behavioral; there is no new control or layout to show.

### Visual caveats

- Avoid screenshots that merely show a "Valid" badge without demonstrating the fix.

## Handoff

- Copy stage: create new EN/FR MDX for all three slugs. Do not modify published entries.
- Media stage: assess only these three entries; add new pr-316 assets where justified.
