# Changelog outline: pr-298

## Decision

Add one follow-up entry, `landing-page-faq-and-pricing-polish`, for PR #302. The changes form one coherent finishing pass across the redesigned public site. Existing pr-298 entries are published history and remain untouched.

## Coverage

- Included: `37975f5f` / PR #302 landing typography, color, FAQ, touch interaction, and pricing stability polish → `landing-page-faq-and-pricing-polish`.
- Covered: `c7146f07` original visual redesign → `landing-page-redesign` (immutable).
- Covered: `0d9e9c5d` responsive landing chart previews → `landing-performance-chart-carousel` (immutable).
- Covered: `83862c67` desktop and mobile landing navigation → `landing-navbar-features-and-updates` (immutable).
- Covered: `15bbc4a6` mobile billing payment history → `billing-payment-history-mobile-layout` (immutable).
- Covered: `6756afeb` calendar day keys and profile timezone → `calendar-grid-day-keys-timezone-fix` (immutable).
- Skipped: `a002453d` / PR #305 — narrow Safari 26 browser-chrome correction; too small and environment-specific for a separate entry.
- Skipped: `77cdb604` / PR #306 — internal admin email tooling with no new product capability.
- Skipped: `11311178` — changelog publication only.
- Skipped: `a2650ad0` / PR #303 — internal agent workflow and repository guidance.
- Skipped: `bd4ef1e5` — merge-only synchronization.
- Skipped: grouped ancestry-only changes already published on `main`.

## Entry: landing-page-faq-and-pricing-polish

- User outcome: The redesigned public site is easier to scan and operate, with a clearer FAQ and pricing controls that no longer move while visitors compare billing periods.
- Audience: Prospective traders and public-site visitors on desktop and mobile, in English and French.
- Surfaces: `/{locale}` typography, section framing, FAQ, mobile controls, and pricing; `/{locale}/pricing` **Monthly**, **Yearly**, and **Lifetime** selector and plan cards.
- Dates: 2026-07-12 → 2026-07-12.
- Grouping rationale: The color, typography, interaction, FAQ, and pricing changes are one visual finishing pass on the recently redesigned public experience. They belong in one new follow-up entry rather than separate component-level announcements or edits to the original redesign post.
- Important details: Describe observable improvements rather than OKLCH tokens or CSS. The FAQ is now an accordion with expanded localized answers. Mobile hit targets and press feedback are clearer. Pricing cards reserve their layout while billing-period details change. Do not claim that the narrow Safari 26 correction applies broadly.
- Try it: Link readers directly to the localized homepage and pricing page. Use descriptive Markdown links, not bare `/en`, `/fr`, or `/pricing` text.

### Story options

- Present the work as the finishing pass that makes the redesigned public site easier to read and operate.
- Lead with the two clearest outcomes—FAQ readability and stable pricing—then briefly connect them to the broader visual polish.

### Visual moments

- The FAQ with one localized answer expanded.
- A short pricing interaction from **Monthly** to **Yearly** to **Lifetime**, showing that the plan-card grid stays fixed.
- A broad landing overview only if it communicates something not already shown by the published redesign entry.

### Visual caveats

- Do not modify or recapture media wired to existing entries.
- Capture English and French separately when localized copy is visible.
- Pricing stability is an interaction claim and is clearer in motion.
- Do not simulate Safari browser chrome in Chromium.

## Handoff

- Copy stage: create new EN/FR `landing-page-faq-and-pricing-polish.mdx` files. Do not change existing entries.
- Media stage: assess only the new entry, add new filenames for justified assets, and leave published assets untouched.
