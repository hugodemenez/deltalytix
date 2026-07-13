# Changelog outline: pr-298

## Decision

Update the existing EN/FR `landing-page-redesign` entry and hand it through both the copy and media stages. Do not create a separate slug for PR #302: its FAQ, typography, color, interaction, and pricing work is one coherent continuation of the landing-page visual refresh. The other four existing entries remain complete.

## Coverage

- Covered: `6756afeb` calendar grid day keys now follow the profile timezone → `calendar-grid-day-keys-timezone-fix`.
- Covered: `c7146f07` landing-page redesign plus the coherent visual-polish pass in `37975f5f` / PR #302 → `landing-page-redesign`. The existing copy already describes the refreshed hero, editorial feature flow, pricing, FAQ, open-source section, visual dividers, and bilingual public experience; the existing media was captured after PR #302. PR #302 additionally refines colors and typography, rebuilds FAQ interactions, improves touch targets and press feedback, and prevents the Lifetime pricing toggle from shifting the cards, but these are supporting details rather than a separate release story.
- Covered: `0d9e9c5d` responsive, auto-advancing, swipeable landing-page chart previews → `landing-performance-chart-carousel`.
- Covered: `83862c67` desktop Features/Updates/Pricing navigation and mobile accordion navigation → `landing-navbar-features-and-updates`.
- Covered: `15bbc4a6` responsive billing payment-history rows and actions → `billing-payment-history-mobile-layout`.
- Skipped: `a002453d` / PR #305 — narrow Safari 26 mobile-dark-mode browser-chrome correction for the redesigned landing page. It removes the white top strip, respects the iOS safe area, and re-samples the active theme; this is a corrective edge-case follow-up to `landing-page-redesign`, not an independently discoverable feature.
- Skipped: `77cdb604` / PR #306 — internal admin/marketing tooling. It adds an EN/FR “Landing Page Update” bulk-email template using the already published pr-298 screenshots; it does not add a product capability for traders or public-site visitors.
- Skipped: `11311178` — publication of the five existing EN/FR entries and their media; no additional product behavior.
- Skipped: `a2650ad0` / PR #303 — internal agent-skill discovery, changelog guidance, repository instructions, and removal of Cursor CLI workflows.
- Skipped: `bd4ef1e5` — merge-only synchronization with `main`; no unique user-facing net change.
- Skipped: the grouped ancestry-only range `82ade17f..626a2f22` — these older changes are already present/published on `main` and contribute no unique files to the current `origin/main..origin/beta` net diff, so they must not be duplicated in pr-298.

## Entry update: landing-page-redesign

- User outcome: The redesigned public site now feels more consistent and easier to scan and operate across light and dark themes. The editorial landing flow is reinforced by more deliberate typography, spacing, colors, media framing, FAQ interactions, touch targets, and stable pricing controls.
- Audience: Prospective traders and other public-site visitors on desktop or mobile, including EN and FR readers; existing users comparing plans also benefit from the steadier pricing interaction.
- Surfaces: `/{locale}` hero, numbered feature sections, partner logos, FAQ accordion, pricing section, open-source section, footer, and mobile navigation; `/{locale}/pricing` plan cards and **Monthly**, **Yearly**, and **Lifetime** controls; the public updates-page visual shell where the shared typography and framing polish appears.
- Dates: 2026-07-11 → 2026-07-12.
- Grouping rationale: PR #302 deliberately polishes the landing redesign introduced by `c7146f07`; its color, typography, interaction, FAQ, and pricing changes support the same public-site story and should enrich the existing entry rather than compete with it under another slug. PR #305 is only a supporting mobile Safari correction to that visual story and does not extend the entry's date range.
- Important details: PR #302 replaces scattered hardcoded colors with a consistent light/dark palette, improves heading and paragraph wrapping, adds clearer media framing and section separation, rebuilds the FAQ as an accessible accordion with expanded EN/FR answers, enlarges key mobile hit targets, adds restrained press feedback, and removes layout movement when switching the Plus card to **Lifetime**. Keep the current entry's core description of the hero and numbered feature flow, but enrich it with the most user-relevant polish rather than listing implementation tokens or CSS techniques. PR #305 removes a white browser-chrome strip seen at the top of the dark landing page in Safari 26 and respects the iOS safe area; mention it only if it fits naturally as a small mobile finishing detail, not as a broad browser-compatibility claim.
- Try it: Open `/en` or `/fr`, move from the hero through the numbered features, expand several FAQ questions, then visit the pricing section or `/{locale}/pricing` and switch among **Monthly**, **Yearly**, and **Lifetime** to see the plan cards remain steady.

### Story options

- Present the update as the finishing pass that makes the new editorial landing experience feel coherent from the first hero CTA through FAQ and pricing.
- Concisely emphasize easier scanning, clearer interactions, and a pricing selector that no longer shifts the layout.

### Visual moments

- A desktop or mobile view that connects the refined hero typography and mint-framed media with the numbered feature flow, showing why the page feels like one coherent visual system.
- The FAQ with one answer expanded, demonstrating the clearer accordion treatment and readable answer layout in the matching locale.
- A short pricing interaction switching from **Monthly** or **Yearly** to **Lifetime**, demonstrating that the Plus card and surrounding grid stay stable.
- Optional only if it can be captured faithfully: the dark mobile landing page meeting the Safari top safe area without a white strip.

### Visual caveats

- Existing pr-298 landing media was captured after PR #302 and may already prove the broad visual-polish claim; the media specialist should assess reuse versus a targeted additional capture rather than recapturing by default.
- Capture EN and FR separately when localized copy is visible, and allow enough width or height for the intended text wrapping.
- The Safari 26 top-chrome behavior requires a real compatible Safari/iOS environment; desktop responsive emulation does not reproduce it reliably. Omit that visual rather than simulate or overclaim it.
- Pricing stability is an interaction claim and is clearer in motion than in a static screenshot.

## Handoff

- Copy stage: enrich the existing EN and FR `landing-page-redesign` MDX under the same slug, and update `completedDate` from `2026-07-11` to `2026-07-12`.
- Media stage: reassess the existing localized landing image against the visual moments above, then choose reuse, replacement, or supplemental media based on what best supports the enriched copy.
- New slugs: None.
