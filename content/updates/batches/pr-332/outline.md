# Changelog outline: pr-332

## Decision

Document the user-facing delta between `main` (`0.0.1` / #316) and `beta` for promotion PR #332. The release window is five commits after the post-#316 merge. Earlier beta releases already have published changelog entries on `main`; this batch covers only the new product-visible work.

## Coverage

- Included: `157ca3ff` / PR #320 and `023ab83c` / PR #322 — mobile widget carousel minimap with toolbar trigger and card-deck motion → `mobile-widget-minimap-navigation`
- Included: `9b121987` / PR #319 — landing FAQ retitled **Questions**, multi-open accordion, and self-host agent setup prompt with **Copy prompt** / **Open with** → `landing-faq-questions-self-host-prompt`
- Covered: original mobile widget carousel → `mobile-widget-carousel` (immutable; this batch is a navigation follow-up)
- Covered: earlier FAQ/pricing polish → `landing-page-faq-and-pricing-polish` (immutable)
- Covered: documented self-host / local dashboard bypass → `local-dashboard-auth-bypass-self-hosting` (immutable; FAQ now surfaces it, do not edit that entry)
- Covered: landing redesign and feature previews → `landing-page-redesign`, `landing-performance-chart-carousel` (immutable)
- Skipped: `e3e35dab` / PR #318 — removes redundant feature-section subtitles; typography polish too small for its own story and already covered by the redesign lineage.
- Skipped: `c9274449` / PR #330 — privacy-first PostHog reconnect and growth funnel events; consent banner wiring is internal analytics infrastructure with no distinct trader-facing product capability to announce.
- Skipped: merge-only ancestry already published on `main`.

## Entry: mobile-widget-minimap-navigation

- User outcome: On the mobile dashboard, traders can jump between full-screen widgets via a card-deck minimap in the toolbar instead of only swiping one card at a time or using the old right-rail pills.
- Audience: Mobile dashboard users browsing the **Widgets** tab carousel.
- Surfaces: `/{locale}/dashboard` mobile layout → toolbar minimap trigger (after filters); collapsed stack of up to three upcoming-widget previews; expanded overlay with scaled widget thumbnails; selecting a thumbnail scrolls the carousel and closes the overlay. Accessible labels: **Open widget minimap**, **Close widget minimap**, **Widget minimap** (FR: **Ouvrir/Fermer la mini-carte des widgets**, **Mini-carte des widgets**).
- Dates: 2026-07-15 → 2026-07-15
- Grouping rationale: #320 introduced the minimap stack and #322 moved it into the toolbar with direction-aware card-deck animation and shadow/overflow fixes. One coherent mobile navigation story.
- Important details: Minimap shows upcoming widgets (current excluded) in the collapsed stack; expanded view lists remaining widgets as miniature previews (`scale(0.15)`). Motion is direction-aware when scrolling up/down and respects reduced-motion preferences where Framer Motion is used. Do not restate the original carousel announcement; this is navigation polish on top of it.
- Try it: Link to the localized dashboard; note that the control appears on mobile / compact viewport only.

### Story options

- Lead with faster jump-to-widget navigation on phones, then briefly describe the toolbar stack and expanded deck.
- Frame it as the carousel’s map: swipe for nearby cards, open the minimap to jump farther.

### Visual moments

- Collapsed toolbar minimap stack showing stacked upcoming-widget previews.
- Expanded overlay with multiple miniature widgets, then selecting one to jump.
- Short motion clip of the card-deck animation while scrolling, if capture is practical.

### Visual caveats

- Requires mobile / narrow viewport and a layout with several widgets so the stack and overlay are meaningful.
- Do not replace or recapture `mobile-widget-carousel` assets from pr-288.
- Capture EN and FR only if visible chrome differs meaningfully (toolbar labels are mostly iconographic; ARIA strings may not appear on screen).

## Entry: landing-faq-questions-self-host-prompt

- User outcome: The homepage FAQ is easier to scan and explore, and visitors who want to run Deltalytix locally can copy an agent setup prompt or open it in Cursor, ChatGPT, or Claude from the self-host answer.
- Audience: Prospective users and developers reading the public homepage FAQ; anyone evaluating local / self-hosted dashboard mode.
- Surfaces: `/{locale}` → **Questions** section (was “Frequently Asked Questions” / “Questions fréquemment posées”); accordion `type="multiple"` so multiple answers stay open; FAQ item 5 (**Is it possible to run Deltalytix locally?** / **Est-il possible d'exécuter Deltalytix localement ?**) now affirms local mode with limits (CSV/PDF + demo data; live broker sync stays cloud-only) and embeds **Agent setup prompt**, **Copy prompt**, and **Open with** (Cursor, ChatGPT, Claude).
- Dates: 2026-07-16 → 2026-07-16
- Grouping rationale: Title, accordion behavior, and self-host answer UX ship together as one FAQ refinement. The self-host product capability is already documented in `local-dashboard-auth-bypass-self-hosting`; this entry is about discovering and starting that path from the public FAQ.
- Important details: Do not claim full local broker sync. ChatGPT uses the web `chatgpt.com/?prompt=` URL. This is a follow-up to the earlier FAQ polish entry—create a new slug; do not edit published FAQ posts.
- Try it: Link to the localized homepage Questions / FAQ section.

### Story options

- Lead with the clearer **Questions** section and multi-open reading, then highlight the self-host prompt actions.
- Lead with “run it locally from the FAQ” and treat the title/accordion polish as supporting context.

### Visual moments

- **Questions** heading with at least one answer expanded.
- Self-host answer expanded showing the prompt block, **Copy prompt**, and **Open with** popover (Cursor / ChatGPT / Claude).

### Visual caveats

- Localized EN/FR copy differs; capture both when the answer text is visible.
- Do not modify media attached to `landing-page-faq-and-pricing-polish` or the self-hosting entry.
- **Open with** is a popover interaction—prefer a still of the open menu or a short clip.

## Handoff

- Copy stage: create new EN/FR MDX for `mobile-widget-minimap-navigation` and `landing-faq-questions-self-host-prompt` only. Do not modify published entries.
- Media stage: assess only these two entries; add new pr-332 assets where justified.
