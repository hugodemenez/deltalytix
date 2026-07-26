# Changelog outline: pr-378

## Release window and evidence

- Reviewed `38b9e6c..d23f872` (the commit immediately after the PR #332 changelog through the current snapshot). The promotion PR itself is not present as a local merge commit, so PR #378 is inferred to promote this complete window.
- First user-facing implementation commit in the window: `cf7c3dc` on 2026-07-15 (social preview work; committed before its later squash merge). Last: `d23f872` on 2026-07-26.

## Coverage

- Included: dark, localized site/update/referral/connections Open Graph redesign (`cf7c3dc`–`5b4c093`, #331; `712842f`, #339; `33024f7`, #340) → `dark-localized-link-previews`
- Included: connection-management hub, inline file import, streamlined provider connect sheets, clearer monochrome branding and actions, OAuth callback hardening, instant/cached Connections navigation, per-connection and bulk refresh, last-trade metadata, and mobile account-row alignment (`8324011`–`abfd660`, #328; `55bac33`, #346; Connections portion of `fee2ddd`, #344; `5c850d4`–`2addbc2`, #369; `d23f872`, #377) → `connections-hub-and-streamlined-imports`
- Included: mobile-friendly, accessible widget explanation popovers (`50d3d27`, #349) → `mobile-widget-info-popovers`
- Included: responsive daily/weekly calendar detail drawers plus restored financial-event ingestion (`4b4a1f5`, #351; `1475f7d`, #374) → `calendar-events-and-mobile-details`
- Included: localized authentication email templates and non-empty renewal notices (`4137209`, #350; `5ae946e`, #354) → `clearer-localized-account-emails`
- Included: faster landing/dashboard transitions, non-blocking GitHub statistics, cached dashboard shells, import merges without a full-history refetch, trade-query indexes, and initial trade-table rendering/navigation fixes (`fee2ddd`, #344; `3c7e52f`, #348; `90bd091`, #355; `42176f3`–`bc3023a`, #359; `e098ec8`–`c68a462`, #362; `c939c2d`–`965475f`, #365; `00d9f99`–`2f54e89`, #366; `2937405`–`16594cb`, #370) → `faster-more-reliable-dashboard-navigation`
- Included: server-side Rithmic R | Protocol connection and synchronization path (`eab44ec`–`3469d8b`, #327) → `rithmic-protocol-server-sync`
- Included: dashboard-navbar feedback/bug-report form with optional reply email and acknowledgement (`c0321e3`, #367) → `send-feedback-from-the-dashboard`
- Skipped: PostHog beta invitation/survey experiments and follow-up reliability changes (`ed94a5a`–`4db1ba6`, #335/#337/#338/#341/#343) — product-research instrumentation for a temporary beta cohort, not a durable product capability; the durable feedback form has its own entry.
- Skipped: Safari browser-chrome theme strip fix (`6025bf7`, #342) — narrow cosmetic browser edge case.
- Skipped: connection credential encryption and migration (`a9ebf2c`, #358, plus Protocol hardening commits) — important security implementation with no new user workflow or migration action.
- Skipped: Forex Factory backfill endpoint removal (`3463e98`, #356) — obsolete cron/internal cleanup; current financial events behavior is included separately.
- Skipped: team invitation email moved out of a server action (`e5248df`, #373) — targeted regression fix to the already-announced Teams workflow (`teams-platform-data-sharing`), with no new workflow.
- Skipped: shared-agent skill consolidation (`5d1c643`, #375), dependency/config changes, generated Prisma client/protobuf files, tests, migrations, seed samples, and review/build fixes — internal development or supporting implementation.

## Entry: dark-localized-link-previews

- User outcome: Links to Deltalytix now produce more consistent dark preview cards that match the landing page, with readable contrast and locale-aware Connections previews rather than missing or mismatched artwork.
- Audience: Visitors and users sharing the site, referrals, update posts, shared pages, or the Connections route in social/chat clients.
- Surfaces: Social/link unfurls for the root site, referral pages, updates, shared pages, and `/dashboard/connections`; Open Graph and Twitter metadata.
- Dates: 2026-07-15 → 2026-07-18
- Grouping rationale: The commits are one visual/metadata redesign across the family of share cards; Connections-specific routing makes that same preview system work through authentication redirects.
- Important details: Preview rendering uses a dark, text-safe visual language and localized alt/metadata where available. This changes link previews, not the in-app dashboard itself.
- Try it: Paste a Deltalytix or Connections link into a service that renders Open Graph cards.

### Story options

- Deltalytix links look like Deltalytix before a recipient even opens them.
- A concise polish note covering consistent, accessible social previews.

### Visual moments

- A generated site or Connections preview card showing the dark chart-led treatment and localized title.

### Visual caveats

- Social clients cache previews aggressively; validate with a fresh URL or preview debugger. Do not imply every client refreshes an old unfurl immediately.

## Entry: connections-hub-and-streamlined-imports

- User outcome: Broker connections and their hosted trading accounts can be managed from one dedicated Connections screen, while file-only accounts can be imported inline. Provider cards expose connection health, account/trade counts, schedules, last sync/last trade, reconnect/delete actions, and direct or bulk synchronization.
- Audience: Traders who sync Rithmic, Tradovate, DxFeed, Thor, or Rithmic Protocol, and traders importing files for standalone accounts.
- Surfaces: Dashboard navbar **Connections**; `/dashboard/connections`; **Add connection**, provider `+` actions, **Import file**, **Sync now**/**Sync all**, schedules, reconnect/delete menus, and connect sheets. The former `/dashboard/import` flow redirects/feeds this experience.
- Dates: 2026-07-16 → 2026-07-26
- Grouping rationale: UI, routing, caching, provider connect sheets, refresh behavior, and responsive polish all deliver the same consolidated connection-management workflow.
- Important details: Tradovate, DxFeed, and Thor open directly into provider-specific connect views; OAuth callbacks use a trusted request origin. Already imported trades remain when a connection is removed. Non-syncing/standalone rows show a last-trade date instead of misleading sync metadata. Per-row loading keeps the connection being synced identifiable, and the screen is usable on narrow widths.
- Try it: Open **Dashboard → Connections**, add or expand a provider, run a sync, or choose **Import file** for a standalone account.

### Story options

- One home for every way trades enter Deltalytix.
- Lead with connection visibility and management, then mention the shorter add/import flow.

### Visual moments

- The Connections overview with several provider sections expanded, account metadata, and the primary actions visible.
- A provider connect sheet or inline file-import state that demonstrates staying within the same workflow.
- A narrow viewport showing aligned account rows and usable actions.

### Visual caveats

- Requires seeded connections/accounts to avoid an empty screen; redact credentials and personally identifying account numbers. Provider/OAuth availability may depend on local environment variables.

## Entry: mobile-widget-info-popovers

- User outcome: Widget help text opens as a tap-friendly popover on phones and remains keyboard/screen-reader accessible, rather than depending on hover tooltips that could clip or be unreachable.
- Audience: Dashboard users learning what chart, statistic, account, filter, mindset, or trade-table widgets mean; also viewers of embeddable charts.
- Surfaces: Info buttons across dashboard and embedded widgets.
- Dates: 2026-07-19 → 2026-07-19
- Grouping rationale: A shared interaction replacement was applied consistently across all widget families.
- Important details: The popover supports click/tap, focus, Escape/outside dismissal, and viewport-aware positioning; reduced-motion behavior is respected.
- Try it: On a phone-sized dashboard, tap the information icon on a chart or statistic card.

### Story options

- Widget explanations are now actually reachable on touch screens.
- Treat as a concise mobile accessibility improvement.

### Visual moments

- A phone viewport with an info popover open beside a chart, positioned fully within the screen.

### Visual caveats

- Capture a widget that has meaningful seeded data and ensure the popover does not obscure the claim being illustrated.

## Entry: calendar-events-and-mobile-details

- User outcome: Scheduled financial events appear in the calendar again, and daily/weekly calendar details open in bottom drawers that fit small screens while retaining the richer dialog on desktop.
- Audience: Traders reviewing performance and market context from the dashboard calendar, especially on mobile.
- Surfaces: Dashboard calendar; daily and weekly detail modals/drawers; financial-event rows and consent UI presented alongside drawer surfaces.
- Dates: 2026-07-19 → 2026-07-25
- Grouping rationale: Both changes restore or improve the calendar review experience; one restores its market-event context and the other makes its detail views usable on mobile.
- Important details: Mobile drawers use constrained height and scrollable content; desktop continues to use dialogs. Financial events now come from the Investing.com ingestion path after the prior feed stopped working.
- Try it: Open a day or week from the calendar on a narrow screen and review its trades/events in the drawer.

### Story options

- Calendar context is back, with details redesigned for the screen in your hand.
- A brief reliability-and-responsive follow-up rather than presenting a new calendar feature.

### Visual moments

- Daily and weekly detail states in a mobile bottom drawer, ideally with a financial event visible.

### Visual caveats

- Event availability depends on successfully seeded/fetched financial-event data and the selected date range. Avoid claims that the third-party source is real-time.

## Entry: clearer-localized-account-emails

- User outcome: Authentication emails can arrive in the user's language, and subscription-renewal notices no longer arrive with an empty message body.
- Audience: Users signing in through Supabase email flows and subscribers receiving renewal notices; English- and French-speaking users in particular.
- Surfaces: Supabase magic-link/authentication email template and renewal notification email.
- Dates: 2026-07-19 → 2026-07-19
- Grouping rationale: Two small fixes form one coherent story about account emails being understandable and complete.
- Important details: Locale selection is carried into auth email rendering; do not imply every transactional email was redesigned or every language is supported.
- Try it: Request an email sign-in link in English or French.

### Story options

- Small but important inbox polish: the right language and no blank notices.
- Keep this as a compact service-reliability entry.

### Visual moments

- None — inbox rendering and delivery limitations make the behavior clearer in text.

### Visual caveats

- Email capture requires a configured local mail sink or provider and may not represent all clients.

## Entry: faster-more-reliable-dashboard-navigation

- User outcome: Landing and dashboard pages begin rendering sooner, dashboard-to-dashboard navigation retains an immediate shell, large imports no longer trigger an avoidable full-history reload, and the trade table reliably shows its first page instead of appearing empty.
- Audience: All visitors and dashboard users, with the largest benefit for accounts with long trade histories.
- Surfaces: Landing page GitHub stats; dashboard home, Connections, Import, Data, Billing, Settings, and locale-aware dashboard navigation; trade review table and dashboard tab bar.
- Dates: 2026-07-18 → 2026-07-24
- Grouping rationale: Cache Components, prefetched/cached shells, query/index changes, and rendering fixes are one end-to-end perceived-speed and navigation-reliability effort.
- Important details: Dynamic user data still resolves for the authenticated user; cached chrome/skeletons are not stale account data. The trade table clamps invalid pages and falls back safely, and its tab bar no longer leaves a visual gap beneath the navbar.
- Try it: Move between dashboard home, Connections, Import, and Data, then import trades and return to the first trade-table page.

### Story options

- Less waiting and fewer blank states as you move around the dashboard.
- Focus copy on observable responsiveness rather than the underlying caching architecture.

### Visual moments

- A navigation recording showing the immediate dashboard shell and populated destination.
- The first trade-table page populated after initial load/import.

### Visual caveats

- Performance evidence is sensitive to cache warmth, database size, and network; avoid numeric speed claims without repeatable measurement.

## Entry: rithmic-protocol-server-sync

- User outcome: Traders with approved Rithmic R | Protocol access can connect credentials, choose the appropriate Rithmic system, discover hosted accounts, and import order/fill history through Deltalytix's server-side sync flow.
- Audience: Rithmic users whose broker/prop firm and credentials support the R | Protocol API; not every existing Rithmic user.
- Surfaces: **Dashboard → Connections → Add Rithmic Protocol connection** and the Rithmic Protocol connect/sync sheet; also available as the **Rithmic Protocol** import type.
- Dates: 2026-07-15 → 2026-07-25
- Grouping rationale: Protocol client, credential manager, account discovery, fills-to-trades conversion, API routes, connection cards, and sync status are one new provider integration.
- Important details: This is a distinct server-side Protocol API path, not a replacement for the existing Rithmic integration already announced in `automatic-rithmic-sync`. Stored credentials are encrypted. Availability requires server configuration and valid Rithmic credentials/entitlements; system options are constrained by deployment configuration. UI includes Rithmic attribution and copyright guidance.
- Try it: From **Connections**, add **Rithmic Protocol**, select a system, enter credentials, choose discovered accounts, and start synchronization.

### Story options

- A new server-side route from Rithmic order history into the journal.
- Lead with who can use it and the connection steps, explicitly distinguishing it from legacy Rithmic sync.

### Visual moments

- The Protocol connect sheet at the system/credential step with sensitive fields empty.
- The discovered-account selection or per-row synchronization progress state.

### Visual caveats

- Capture requires configured Protocol endpoints and entitled test credentials; never expose usernames, passwords, account identifiers, hostnames, or tokens. If safe data is unavailable, prefer text-only treatment.

## Entry: send-feedback-from-the-dashboard

- User outcome: Users can send feedback or report a bug without leaving the dashboard, optionally attach a reply email, and receive an on-screen success state plus an acknowledgement email when an address is supplied.
- Audience: Any authenticated dashboard user who wants to suggest an improvement or report a problem.
- Surfaces: Dashboard navbar **Send feedback or report a bug** button; **Share your feedback** dialog; message and optional email fields.
- Dates: 2026-07-25 → 2026-07-25
- Grouping rationale: Navbar entry point, form, API, notification, acknowledgement, and localized copy make one complete feedback workflow.
- Important details: The message is required and length-limited; email is optional but must be valid if provided. English and French UI/email copy are included. This is distinct from the temporary PostHog Connections survey.
- Try it: Select the message-square-plus action in the dashboard navbar, enter feedback, optionally add a reply email, and submit.

### Story options

- A direct line from anywhere in the dashboard to the people building it.
- Concise call-to-action emphasizing feedback and bug reports in one place.

### Visual moments

- The feedback dialog open from the dashboard navbar, with the message and optional email controls visible.
- The localized success state after submission, if email delivery is safely stubbed.

### Visual caveats

- Email delivery requires provider configuration. Use synthetic copy/address, and avoid actually sending test content to production recipients.
