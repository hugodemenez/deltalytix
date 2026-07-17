# Changelog media plan: pr-332

## mobile-widget-minimap-navigation

- Decision: 1 visual
- Rationale: The entry’s core claim is jump-to-widget via the expanded card-deck overlay. One mobile screenshot of the open minimap with miniature widget thumbnails proves that faster than copy. A collapsed-stack-only shot is too subtle next to the existing carousel capture, and a scroll-motion clip would mostly restate the same control without adding a distinct claim.
- Primary/card asset: `mobile-widget-minimap-navigation.png` — `widgets-mobile-minimap` scene on the Widgets tab with the expanded Widget minimap overlay open.
- Additional assets: none
- Omitted candidates:
  - Collapsed toolbar stack only — hard to read at phone scale and does not show jump selection.
  - Card-deck scroll motion MP4 — direction-aware animation is a polish detail; the expanded overlay already proves the new navigation surface.
  - Reusing `mobile-widget-carousel` assets from pr-288 — those show the carousel itself, not the minimap; published assets stay untouched.

## landing-faq-questions-self-host-prompt

- Decision: 1 visual
- Rationale: The distinctive product moment is the self-host FAQ answer with the agent setup prompt and **Copy prompt** / **Open with** actions. One desktop screenshot of that answer open (with the Open with menu visible) covers the discovery path and the new CTA surface. A Questions-heading-only frame or a generic first-item accordion shot would not evidence the self-host prompt.
- Primary/card asset: `landing-faq-questions-self-host-prompt.png` — `landing-faq-self-host` scene scrolled to `#faq`, self-host question expanded, **Open with** popover open (Cursor / ChatGPT / Claude).
- Additional assets: none
- Omitted candidates:
  - Questions heading with an unrelated answer open — title/accordion polish is secondary; the prompt block is the proof.
  - Multi-open accordion demo video — behavior is clear from copy; video would not add a distinct claim beyond the self-host still.
  - Reusing `landing-page-faq-and-pricing-polish` media from earlier batches — immutable; that shot predates the self-host prompt UI.

## Immutability check

- No published MDX or earlier-batch assets are modified.
- New assets land only under `public/updates/pr-332/{en,fr}/`.
