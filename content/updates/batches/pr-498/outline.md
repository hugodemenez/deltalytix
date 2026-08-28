# Changelog outline: pr-498

Promotion PR: #498 (`main` ← `cursor/release-beta-to-main-changelog-7614`).

## Release window and evidence

- Actual tree window: `git diff origin/main origin/beta` — 58 files. This is the unique product work after #488.
- Commit log `origin/main..origin/beta` still lists the pre-#488 history because #488 squash-merged the previous beta tip; those commits are **Covered** by published `pr-475` and `pr-488` entries and must not be rewritten.
- `4cbfafdd` (#489, “Merge main into beta after #488”) has a single parent and did not change the merge-base. Unique commits after that snapshot:
  - `4551c0de` 2026-08-27 Add Tailscale to the Cloud Agent environment install (#491)
  - `e431b6a8` 2026-08-28 fix(calendar): typecheck TS2590 on month translation keys (#493) — also lands the #487 calendar / navbar / filter / share UI
  - `b1081a99` 2026-08-28 fix(calendar): show month/year picker labels in Edge dark mode (#496)
  - `0c1151ac` 2026-08-28 Wait for an existing dockerd in Cloud Agent start (#495)
  - `c869a6d6` 2026-08-28 fix(dashboard): widget toolbar hover and dark-mode contrast (#497)
  - `1ac1829e` 2026-08-28 Apply Product RMS commissions on Rithmic Protocol sync (#492)
- Last production promotion on main: #488 compare hub / DeepCharts / account actions / Protocol live balances / public 404 (`futures-journal-compare-hub`, `deepcharts-csv-import`, `connection-account-mask-rename-delete`, `rithmic-protocol-live-balances`, `public-404-and-llms-txt` — all immutable). Main also has #476 Privacy controls on Settings v2.

Published entries checked and left untouched include: `futures-journal-compare-hub`, `deepcharts-csv-import`, `connection-account-mask-rename-delete`, `rithmic-protocol-live-balances`, `public-404-and-llms-txt`, `dashboard-v5-shell`, `settings-v2-account-page`, `dxfeed-login-detects-prop-firm`, `csv-ai-chunked-parse`, `en-trading-journal-positioning`, `landing-ios-safari-canvas-chrome`, `mindset-journal-editor-stability`, `calendar-events-and-mobile-details`, `rithmic-protocol-primary-connection`, `rithmic-protocol-server-sync`, `rithmic-live-balance-display`, `dashboard-tabs-and-toolbar-small-screens`, `dashboard-active-filters-in-navbar`, `customizable-dashboard-widgets`, `shared-layouts-edit-account-numbers`.

Every proposed slug below is new under `content/updates/`.

## Coverage

- Included: Calendar month/year chips + News country/importance filter (`e431b6a8` #493 calendar files) and Edge dark-mode picker labels (`b1081a99` #496) → `calendar-month-year-and-news-filter`
- Included: Desktop centered **Widgets / Table / Accounts** tabs; phone keeps a compact view dropdown (`e431b6a8` #493 navbar + `dashboard-view-tabs.tsx`) → `dashboard-centered-view-tabs`
- Included: Product RMS commissions on Rithmic Protocol sync (`1ac1829e` #492) → `rithmic-protocol-rms-commissions`
- Covered: Dashboard v5/v6 shell, Settings v2, compare hub, DeepCharts import, connection-account actions, Protocol live balances, public 404 / llms.txt, and the rest of the pre-#488 beta history → published `pr-475` and `pr-488` slugs
- Skipped: Widget toolbar hover and dark-mode contrast (`c869a6d6` #497) — restores hover tint and readable **Edit** / **Add** labels on the existing layout pill; too small for a follow-up to `dashboard-v5-shell`
- Skipped: Filter sheet date calendars, **Clear {section}**, `addFilterAriaCount`, and removal of the mobile `ActiveFilterTags` second navbar row (`e431b6a8` filter files) — polish of the v5 filter control, not a new filter capability
- Skipped: Share dialog rewrite (`e431b6a8` `share-button.tsx`) — same multi-account share; the **Share for all accounts** switch is gone in favor of a picker that defaults to every account; date fields use dropdown-caption calendars. No new share destination
- Skipped: Tailscale Cloud Agent install (`4551c0de` #491) — internal agent environment
- Skipped: Wait for existing dockerd (`0c1151ac` #495) — internal agent environment
- Skipped: `safeTranslate` for `calendar.months.*` (the typecheck part of #493) — implementation of the month chip
- Skipped: Protocol proto / e2e / CI / `trade-id-utils` identity hash — implementation of `rithmic-protocol-rms-commissions`
- Skipped: `4cbfafdd` #489 — integration commit, single parent

## Entry: calendar-month-year-and-news-filter

- User outcome: The calendar widget title is no longer a static **August 2026** string. Daily view shows **Month** and **Year** chips (with prev/next around the month); weekly view shows a **Year** chip. A **News** chip (newspaper icon; icon-only on narrow screens) opens country search plus importance. In Edge dark mode the open month/year lists stay readable.
- Audience: Anyone who uses the dashboard calendar widget (daily or weekly). Not a new events feed — events were already restored in `calendar-events-and-mobile-details`.
- Surfaces:
  - Calendar widget header on [the dashboard](/en/dashboard) (Widgets view)
  - Labels EN / FR: **Month** / **Mois**, **Year** / **Année**; news trigger **News** / **News** (`calendar.importanceFilter.label`); `aria-label` **Filter news by country and importance** / **Filtrer les news par pays et importance**
  - News menu reuses mindset copy: **Filter by country** / search / **All countries** / **No countries**, plus the existing importance control (low / medium / high)
  - Open native lists: option text is `#171717` on white in both themes (Edge no longer paints a blank overlay)
- Dates: 2026-08-28 → 2026-08-28
- Grouping rationale: One calendar-header story. Month/year navigation and the News chip replaced the old title + star importance control together. #496 is the same picker becoming usable in Edge dark mode — do not split a browser-specific fix. Do not fold navbar view tabs or the filter sheet into this entry.
- Important details:
  - Year list is 2000 through current year + 2; an out-of-range current year is still included.
  - Daily: month chip + year chip; chevrons step months. Weekly: year chip only; chevrons step years.
  - Country badge on the News chip shows the selected-country count when any country is selected.
  - Do not claim a new financial-events data source. Do not claim the shadcn dropdown calendar in Share/Filters is this widget.
  - Follow-up to `calendar-events-and-mobile-details` without rewriting it.
- Try it: On [the dashboard](/en/dashboard), open the calendar widget, use **Month** / **Year**, then open **News** and pick a country or importance.

### Story options

- Jump to a month or year on the calendar, and filter news from one **News** chip.
- Concise: the calendar header is chips now — month, year, and news — and the lists stay readable in Edge dark mode.

### Visual moments

- Daily calendar header: prev, **Month** chip, next, **Year** chip, monthly total, **News** chip.
- Open **Year** (or **Month**) list with readable labels — especially useful as Edge-dark-mode evidence if captured in dark theme.
- Open **News** menu: country search + importance, with a count badge if countries are selected.

### Visual caveats

- Seeded local calendar has trades; news countries depend on seeded financial events. If the country list is empty, capture the closed **News** chip rather than an empty menu.
- Capture EN and FR independently (Mois / Année).
- Do not use the filter-sheet or share date picker as if they were this widget.
- Existing `calendar-widgets` scene is a wide widget shot; a tight header clip is more honest if a new scene is added.

## Entry: dashboard-centered-view-tabs

- User outcome: On `md+` viewports, **Widgets**, **Table**, and **Accounts** return as a centered tab strip in the top bar (keyboard: arrows, Home, End). Below `md`, the same three views stay in a compact dropdown that shows the current view name and a chevron. This revises the v5 “tabs are gone, use the view menu” chrome without changing the three views themselves.
- Audience: Every signed-in dashboard user. Follow-up to `dashboard-v5-shell` (do not edit that entry).
- Surfaces:
  - Dashboard navbar on `/{locale}/dashboard` only (home chrome; hidden on Connections / Data / Settings / Billing)
  - Desktop: `role="tablist"` `aria-label` from `dashboard.tabs.ariaLabel`; tabs **Widgets** / **Table** / **Accounts** (`dashboard.tabs.*`)
  - Phone: trigger shows the active view label; menu is a radio list of the same three
- Dates: 2026-08-28 → 2026-08-28
- Grouping rationale: One view-switcher follow-up. Desktop tabs and the phone dropdown are how the same three views are reached at different widths. Do not re-announce the connections strip, filters, or billing shell. Do not combine with the calendar header.
- Important details:
  - The three views and their data are unchanged.
  - Do not claim the old full-width strip under the navbar is back — these tabs sit centered *in* the 56px top bar, over the filters/share row (pointer-events only on the tablist).
  - Phone dropdown is `md:hidden`; tabs are `hidden` until `md`.
  - Do not mention the skipped filter-chip row or widget-toolbar contrast in this entry unless copy would otherwise imply those areas also changed.
- Try it: Open [the dashboard](/en/dashboard) on a wide window and use the centered tabs; narrow the window to see the compact view dropdown.

### Story options

- Widgets, Table, and Accounts are centered tabs on desktop again; phones keep a compact menu.
- Concise follow-up to the v5 view menu: desktop gets tabs in the top bar.

### Visual moments

- Desktop navbar: logo, filters, centered **Widgets | Table | Accounts** with the active tab as the raised white pill, share + account on the right.
- Optional phone: compact view dropdown showing **Widgets** (or current view) — only if a second width is needed to prove the breakpoint. One desktop shot may be enough.

### Visual caveats

- Capture the home dashboard, not a subpage header.
- Do not photograph the old under-navbar strip (it is gone).
- Light theme matches the v5 canvas; include dark only if it proves a distinct claim (it does not).

## Entry: rithmic-protocol-rms-commissions

- User outcome: Rithmic Protocol sync now writes commission on each closed trade from Product RMS `commission_fill_rate × fill quantity` (entry + exit). Dashboard net (`pnl - commission`) no longer looks high versus Rithmic account P&L for Protocol-imported trades that previously stored `commission: 0`. A later sync updates the existing row instead of inserting a duplicate round-trip.
- Audience: Traders on **Rithmic Protocol** / Lucid-style Protocol imports. Classic Rithmic CSV / API+ paths are unchanged. Not visible as a new column — numbers on calendar, table, and widgets change after sync.
- Surfaces:
  - Connections → existing **Rithmic Protocol** connection → sync / reconnect
  - Downstream: calendar day totals, trade table **Commission**, net P&L widgets
  - No new UI label or settings toggle
- Dates: 2026-08-28 → 2026-08-28
- Grouping rationale: One Protocol-import correctness story. Follow-up to `rithmic-protocol-primary-connection` and `rithmic-protocol-server-sync` without editing them. Do not combine with `rithmic-protocol-live-balances` (PnL plant balances are a different plant and already shipped).
- Important details:
  - Same rate source as R | API+ `ProductRmsListInfo` and the Orders CSV **Commission Fill Rate**.
  - Current RMS config, not historical rates for old fill dates.
  - If Product RMS fails, sync still saves fills with commission `0` and logs a warning.
  - Protocol trade identity still hashes commission as `0` so rows first stored without RMS match; `skipDuplicates` updates commission on that row. A resync must not double calendar net.
  - Requires a configured Protocol endpoint and live credentials. Local bypass cannot honestly show a live RMS rate.
  - Do not claim live commission streaming, a new Accounts column, or a change to classic Rithmic.
- Try it: With a Rithmic Protocol connection, sync again from [Connections](/en/dashboard/connections), then check commission and calendar net on [the dashboard](/en/dashboard).

### Story options

- Protocol imports now include Product RMS commissions, so net matches Rithmic.
- Concise: Lucid/Protocol trades no longer land with commission `0` when RMS has a fill rate.

### Visual moments

- None — the change is a stored number after sync. A screenshot of a commission column cannot prove the rate source without live Protocol data.

### Visual caveats

- Local seed (`LOCAL-SIM-001`) has no Protocol connection. Do not mock rates in product code. Prefer zero visuals over an empty Connections page.
- Do not reuse the classic Rithmic or Solde Rithmic screenshots as if they showed RMS commissions.
