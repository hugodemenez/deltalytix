# Changelog media plan: pr-498

## calendar-month-year-and-news-filter

- Decision: 1 visual
- Rationale: The claim is a **location and layout** change — the static **August 2026** title is gone, replaced by closed Month / Year chips plus a **News** chip in the calendar header. One tightly framed daily-header screenshot proves that in both locales (month name + year number + **News** / **News**; FR month name is **août**, not the English title). A second frame is not needed: opening **News** only restates country search and importance already named in copy, and an empty seeded country list would be a worse photo than the closed chip. Opening the native Month / Year `<select>` is OS chrome (opacity-0 overlay; Playwright does not rasterize the system list), so it cannot honestly prove Edge dark-mode option text. Video would only replay a static header.
- Primary/card asset: `calendar-header-month-year-news.png` — new scene `calendar-header-month-year-news` (desktop 1440×900, `/{locale}/dashboard`, Widgets tab, daily view). Scrolls `[data-slot="calendar-month-year-picker"]` into view, waits for `[data-slot="calendar-month-select"]`, `[data-slot="calendar-year-select"]`, and `[data-slot="calendar-news-filter"]`, then clips the wrapping `[data-slot="card-header"]`. Expected: prev / month chip / next / year chip / monthly total / **News** (newspaper icon + label). Does not include the day grid. Does not open Month, Year, or News.
- Additional assets: none.
- Omitted candidates:
  - Open **News** menu (country search + Low / Medium / High) — a distinct surface, but it proves a filter form the copy already names. Seeded financial-event countries may be empty; the outline says capture the closed chip rather than an empty menu.
  - Open Year or Month native list — cannot be captured cleanly; the Edge dark-mode `#171717` on white fix is documented in copy, not shown.
  - Weekly header (Year chip only) — same chrome minus the month chip; daily is the fuller claim.
  - Existing `calendar-widgets` scene — a wide widget + grid photo; it would hide the header change inside a generic calendar shot.
  - Filter-sheet or share dropdown-caption calendars — different widgets; must not stand in for this header.
  - Dark-theme header — same chips; does not prove a distinct claim (the Edge overlay issue is the *open* native list).
  - Icon-only News on a phone width — the desktop chip with the **News** label is the clearer evidence.

## dashboard-centered-view-tabs

- Decision: 1 visual
- Rationale: The claim is **where** the three views live on a wide window: centered *in* the 56px top bar (raised white pill on the active tab), not the old full-width strip under the navbar and not the v5 compact view menu as the only desktop control. One 1440-wide navbar clip with **Widgets** selected shows logo, filters, the centered tablist, and share + account together. A phone dropdown shot would prove the breakpoint, but the copy already states phones keep the compact menu; one desktop frame is enough for the follow-up to `dashboard-v5-shell`. No motion — the tabs are a static layout.
- Primary/card asset: `dashboard-centered-view-tabs.png` — new scene `dashboard-centered-view-tabs` (desktop 1440×900, `/{locale}/dashboard` home only). Waits for `role="tablist"`, confirms the **Widgets** tab is selected, settles the navbar subscription badge, clips the sticky `<nav>` (h-14 home chrome). Expected EN: **Widgets | Table | Accounts**; FR: **Widgets | Tableau | Comptes**. Widgets is the raised white pill. Does not visit Connections / Data / Settings / Billing.
- Additional assets: none.
- Omitted candidates:
  - Phone compact view dropdown (`md:hidden`) — true second width, but one desktop shot already proves the entry’s headline. A second asset would mostly restated the v5 menu.
  - Full-page `dashboard-shell-home` reuse — that scene was the v5 *view menu* story; recycling it would contradict this follow-up.
  - Table or Accounts selected — same tablist; Widgets is the default home and matches “open the dashboard.”
  - Dark theme — same layout; light matches the v5 canvas already published.
  - Keyboard focus ring on a tab — interaction trivia; not a second claim.

## rithmic-protocol-rms-commissions

- Decision: 0 visuals
- Rationale: The change is a **stored number after Protocol sync** (Product RMS `commission_fill_rate × quantity` on entry and exit). There is no new column, toggle, or Connections chrome. Local seed (`LOCAL-SIM-001`) has no Protocol connection, so a commission column or calendar net cannot be attributed to RMS. Capture-only rate mocks do not exist under `scripts/changelog-media/`. Product code must not be mocked. Zero visuals is the honest choice; copy already names the rate source and the resync identity rule.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - Trade table **Commission** on seeded standalone trades — those rows are not Protocol imports and cannot prove RMS fill rates.
  - Connections page with no Protocol row — an empty or standalone-only hub would look like a missing feature.
  - Reusing Solde Rithmic / classic Rithmic / Protocol-primary screenshots — those shipped other claims (live balances, connection setup). They must not stand in for RMS commissions.
  - Injecting fake Protocol rates in product code — forbidden.

## plus-back-to-work-checkout-promo

- Decision: 0 visuals
- Rationale: The claim is an **auto-applied Stripe promotion** on new Plus Checkout, plus a **Back to Work** / **Rentrée** badge when the campaign env vars are set. Local `.env.local` has empty `STRIPE_BTW_MONTHLY_PROMO` / `QUARTERLY` / `YEARLY`, so Pricing and Billing correctly render regular Plus prices with no badge. A screenshot of that default would not prove the campaign and could be read as “nothing changed.” Capture-only promo mocks do not exist under `scripts/changelog-media/`. Product code must not be mocked. Copy already names the badge, the auto-apply behavior, and the Lifetime exclusion. Zero visuals is the honest choice.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - Public `/pricing` Plus card at list price — the campaign is off locally; that frame is the non-promo default.
  - `landing-pricing-stability` video — it was captured for card-layout stability, not this campaign, and must not be reused as Back to Work evidence.
  - Billing plan list without the **Rentrée** pill — same empty-env default.
  - Inventing a percent-off overlay or a fake struck price — forbidden.
  - Injecting promotion ids into product code for screenshots — forbidden.

## Email still (not a changelog entry)

- Decision: 1 visual, not wired into MDX
- Rationale: Zeno/Drop need a 16:9 dashboard HOME still of current beta chrome (centered **Widgets / Table / Accounts** tabs) for the Back to Work mail. This is not evidence for a changelog claim and is not campaign copy. Public path after merge: `/updates/pr-498/en/dashboard-home-email.png` (FR twin alongside).
- Primary/card asset: none for changelog cards.
- Additional assets:
  - `dashboard-home-email.png` — scene `dashboard-home-email` (desktop 1440×900, clip 1440×810 / 16:9 from y=0, light theme, Widgets selected). Navbar + connections strip + first widget row. EN and FR.
- Omitted candidates:
  - Full-page 4:3 dashboard — too tall for a 100% fluid email image.
  - Navbar-only `dashboard-centered-view-tabs` crop — does not show HOME widgets.
  - Landing Import Trades shot — wrong surface.
  - Stripe promo / sale prices — do not mock promotion ids.


