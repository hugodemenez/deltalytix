# Changelog media plan: pr-298

## landing-page-redesign

- Decision: 3 visuals
- Rationale: The existing localized hero is strong evidence for the redesigned typography, editorial hierarchy, and mint-framed product preview. The enriched copy adds two distinct claims that the hero cannot show: the readable expanded FAQ treatment and the lack of card movement while changing pricing periods. A focused screenshot proves the FAQ state, while a short video is necessary to demonstrate pricing stability over time.
- Primary/card asset: `landing-page-redesign.png` — existing `landing-hero` scene showing the localized hero and mint-framed dashboard preview.
- Additional assets:
  - `landing-page-redesign-faq.png` — `landing-faq-expanded` scene with the first localized FAQ answer expanded, supporting the claim that answers are clearer and more readable.
  - `landing-page-redesign-pricing-stability.mp4` — `landing-pricing-stability` scene switching the localized desktop pricing selector from Monthly to Yearly to Lifetime while the Basic and Plus card grid remains fixed.
- Omitted candidates:
  - A second broad landing-page overview — it would repeat the hero and existing feature-carousel evidence.
  - Mobile touch-target press feedback — a capture would add limited evidence beyond the clearer interaction states already described in copy.
  - Safari 26 dark-mode safe-area behavior — desktop emulation cannot reproduce real Safari browser chrome faithfully, so it must not be simulated.

## landing-performance-chart-carousel

- Decision: 1 visual
- Rationale: The existing localized feature-section screenshot locates the carousel, shows the dashboard-style chart treatment, and supports the entry without duplicating motion solely for decoration.
- Primary/card asset: `landing-performance-chart-carousel.png` — existing `landing-features-carousel` scene.
- Additional assets:
  - None.
- Omitted candidates:
  - Carousel video — the entry explains auto-advance and swipe behavior clearly, while another landing-page video would add weight without materially improving this batch.

## landing-navbar-features-and-updates

- Decision: 1 visual
- Rationale: The existing localized open Updates menu directly demonstrates the new navigation surface and its destinations.
- Primary/card asset: `landing-navbar-features-and-updates.png` — existing `landing-navbar-updates` scene.
- Additional assets:
  - None.
- Omitted candidates:
  - Separate Features and mobile-menu captures — they would multiply navigation screenshots without adding enough distinct evidence.

## billing-payment-history-mobile-layout

- Decision: 1 visual
- Rationale: The existing localized mobile screenshot directly proves that invoice metadata, status, and full-width actions fit within the card.
- Primary/card asset: `billing-payment-history-mobile-layout.png` — existing `billing-mobile` scene.
- Additional assets:
  - None.
- Omitted candidates:
  - Desktop billing view — the desktop layout is explicitly unchanged.

## calendar-grid-day-keys-timezone-fix

- Decision: 1 visual
- Rationale: The existing calendar screenshot provides useful product context for the corrected grid cells, while the timezone calculation itself is not meaningfully visual.
- Primary/card asset: `calendar-grid-day-keys-timezone-fix.png` — existing `calendar-widgets` scene.
- Additional assets:
  - None.
- Omitted candidates:
  - Before/after calendar captures — reproducing the old timezone bug would require an artificial state and could overstate what a static image proves.
