# Changelog outline: pr-439

## Release window and evidence

- Reviewed the 21 non-merge commits in `origin/main..origin/beta`, from `1ecc263` on 2026-08-04 through `45e8ec4` on 2026-08-11, plus the tip diff and affected product code.
- `origin/main` already contains the immutable PR #394 EN/FR entries through squash commit `2bc2b6b`; the equivalent IG implementation and changelog commits still appear in beta ancestry and are marked **Covered**, not republished.
- Recent EN/FR entries for the Connections hub, Rithmic Protocol, support assistant, landing redesign/carousels, dark mode, IG import, and import-picker search were checked before proposing follow-ups. Every proposed slug below is new in `content/updates/`.

## Coverage

- Covered: IG Transaction History import (`1ecc263`, #393) → `ig-transaction-history-import`; searchable import-platform picker from the same implementation → `import-platform-picker-search`.
- Covered: PR #394 EN/FR entries, media, and capture workflow (`c4b2dd6`, #396) → the immutable `ig-transaction-history-import` and `import-platform-picker-search` publication artifacts already on `origin/main`.
- Included: homepage interaction and presentation polish — smooth **Features ↓** scroll, tighter text-only AI coach demo, borderless partner logos, and 3-second chart-carousel pacing (`df4ff8b`, #398; `023a8e8`, #399; `5a30800`, #395; `a08ce36`, #405) → `landing-page-interaction-polish`.
- Included: equity-chart hover/legend proximity ordering, single nearest-line active dot, searchable responsive account picker, and an explicit eight-account chart limit (`47d7ed7`, #402) → `equity-chart-nearest-account-hover`.
- Included: My Funded Futures support through DxFeed plus a guided, searchable two-step DxFeed connection form (`e0c3853`, #390; DxFeed portion of `149b0fd`, #436) → `guided-dxfeed-connection-setup`.
- Included: Interactive Brokers trade synchronization through the read-only Flex Web Service (`c589dc5`, #382) → `interactive-brokers-flex-sync`.
- Included: 16 px mobile text fields across dashboard forms to prevent iOS Safari focus zoom (`fc2c4e9`, #404) → `mobile-form-focus-without-zoom`.
- Included: redesigned authentication page with the landing-page visual language, desktop candlestick illustration, clearer email-code state, and **Use a different email** recovery (`5b1c1c5`, #409) → `authentication-page-redesign`.
- Included: support assistant follow-up with source-first code investigation, visible search/read/reasoning states, editable questions, direct human escalation, and a refreshed support page (`4da8946`, #427; `5267ac9`, #428) → `support-assistant-source-first-help`.
- Included: per-connection recurring intervals alongside daily schedules for Tradovate, DxFeed, Rithmic Protocol, and Interactive Brokers (`81a638f`, #434) → `flexible-connection-sync-schedules`.
- Included: Rithmic Protocol becoming the primary Rithmic connection path, a guided searchable setup with password visibility, and reliable LucidTrading fill fallback (`283426a`, #435; Rithmic portion of `149b0fd`, #436) → `rithmic-protocol-primary-connection`.
- Included: current Rithmic Performance CSV exports with a leading **Trade Date** column now import without manual file editing, while legacy exports remain supported (`45e8ec4`, #440) → `rithmic-performance-trade-date-import`.
- Skipped: Cursor Cloud agent instructions (`2fc9875`, #401) — internal development documentation with no product behavior.
- Skipped: integration activation analytics correction (`ae30d4e`, #386) — internal event attribution; connection behavior is unchanged.
- Skipped: removing repetitive **No trades** labels from empty calendar cells (`44a9834`, #406) — narrow copy/spacing polish too small for a separate story.
- Skipped: consent preferences dialog/drawer dark-mode correction (`a952067`, #429) — a narrow visual follow-up to the already-published dark-mode capability, too small for a separate entry.
- Skipped: `.claude/launch.json`, seed scripts, tests, generated Prisma output, schema migration details, environment examples, API plumbing, refactors, and capture-tool changes — internal or supporting implementation for the included/covered stories.

## Entry: landing-page-interaction-polish

- User outcome: The homepage moves more naturally from the hero into product detail, presents the AI coach demo as a compact conversation, cycles performance previews faster, and renders partner logos without faint box outlines.
- Audience: Visitors evaluating Deltalytix from the public homepage.
- Surfaces: `/{locale}`; hero **Features ↓** action and `#features`; AI coach feature demo; **Performance Visualization** and **Track Your Performance** carousels; partner-logo strip.
- Dates: 2026-08-05 → 2026-08-08
- Grouping rationale: Four small commits form one coherent homepage interaction/presentation pass; none warrants a standalone entry, and the published landing redesign, AI coach, and carousel entries remain unchanged.
- Important details: The hero action updates the URL to `#features` while smooth-scrolling. The AI demo removes the synthetic metric card and reduces bubble gaps. Carousel autoplay changes from about six seconds to three seconds; pause/manual navigation remain, and reduced-motion preference still disables progress animation.
- Try it: Open the homepage, use **Features ↓**, then watch the AI coach and performance-preview sections.

### Story options

- A lighter, quicker tour through the homepage.
- Treat as a concise follow-up to the landing redesign, focusing on flow rather than restating existing sections.

### Visual moments

- Hero with **Features ↓**, followed by the feature-section landing position after activation.
- AI coach demo showing several compact text-only turns and its thinking state.
- A performance carousel with its progress control, plus the partner strip without logo outlines.

### Visual caveats

- Smooth scroll and three-second autoplay are better evidenced by a short recording than a still. Preserve reduced-motion behavior during QA.
- Do not replace or revise media attached to `landing-page-redesign`, `landing-ai-coach-demo`, or `landing-performance-chart-carousel`.

## Entry: equity-chart-nearest-account-hover

- User outcome: In a dense individual-account equity chart, the account line closest to the pointer is highlighted and moved to the top of the legend, making overlapping lines easier to identify. Account selection is searchable and cannot silently exceed what the chart can draw.
- Audience: Traders comparing equity across several accounts.
- Surfaces: Dashboard equity widget in individual-account mode; hover state, legend, **Select accounts** popover on desktop, and account-selection drawer on mobile.
- Dates: 2026-08-07 → 2026-08-07
- Grouping rationale: Pointer tracking, legend ordering, active-dot behavior, and account-selection limits all solve the same problem: identifying and controlling lines in a crowded equity chart.
- Important details: Up to eight accounts can be selected, matching the eight distinct chart colors. While hovering, accounts with a point at that date are ordered by vertical distance to the pointer; otherwise the legend falls back to latest equity. The nearest drawn line alone gets the active dot. Shared/team and small-widget views do not show this full legend interaction.
- Try it: Enable individual-account lines on the equity widget, select several accounts, and move the pointer between overlapping lines.

### Story options

- The line under your cursor now identifies itself.
- Lead with dense-chart readability, then mention the searchable eight-account selector.

### Visual moments

- A seeded multi-account equity chart with the pointer beside one line, its active dot visible, and the matching account first in the legend.
- **Select accounts** open with a search query and the selected/maximum summary visible.
- The same selector as a mobile drawer if responsive behavior merits separate evidence.

### Visual caveats

- Seed several accounts with distinct but overlapping equity paths; one or two lines cannot demonstrate proximity ordering.
- Use synthetic account numbers and avoid implying that more than eight individual series can be displayed simultaneously.

## Entry: guided-dxfeed-connection-setup

- User outcome: DxFeed users first choose and search for their prop firm, then enter the matching platform credentials in a focused second step. My Funded Futures traders can now select their firm and connect through its DxFeed endpoint.
- Audience: Traders at DxFeed/Volumetrica-backed prop firms, including My Funded Futures (MFFU).
- Surfaces: **Dashboard → Connections → Add DxFeed connection** and the DxFeed connect sheet; prop-firm picker, **Continue**, and credential step.
- Dates: 2026-08-07 → 2026-08-11
- Grouping rationale: The new provider option and guided connect form are one DxFeed onboarding story: find the firm, then authenticate against the correct endpoint.
- Important details: The picker is searchable and becomes a drawer on mobile. Credentials are the same email/password used on the selected prop firm's platform. Inline validation distinguishes missing/invalid email, missing password, and missing firm. Do not imply every prop firm is supported merely because it uses DxFeed.
- Try it: Open **Connections**, add **DxFeed**, search for **My Funded Futures**, continue, and review the credential step.

### Story options

- A clearer path from prop firm to connected DxFeed account.
- Lead with My Funded Futures availability, supported by the redesigned two-step connection flow.

### Visual moments

- Step one with the prop-firm search narrowed to **My Funded Futures**.
- Step two with the selected firm summarized and empty email/password fields ready for safe demonstration.
- A mobile prop-firm drawer showing the searchable list, if capture adds useful responsive context.

### Visual caveats

- Never capture real prop-firm credentials. Use empty fields or dedicated test credentials and redact account identifiers.
- Connection completion requires a reachable provider endpoint; the setup states remain useful evidence if safe authentication is unavailable.

## Entry: interactive-brokers-flex-sync

- User outcome: Interactive Brokers traders can connect a read-only Flex Query once, import completed trades, keep the connection on the Connections page, and run later manual or automatic synchronizations without uploading statements.
- Audience: Interactive Brokers users who can enable the Flex Web Service in Client Portal.
- Surfaces: **Dashboard → Connections → Add Interactive Brokers connection**; IBKR setup guide; **Token and query ID**, **Verify and connect**, saved connections, **Sync now**, reconnect, remove, and schedule controls.
- Dates: 2026-08-08 → 2026-08-08
- Grouping rationale: Client Portal guidance, token/query detection, Flex report retrieval, completed-trade conversion, connection management, and localized errors ship as one provider integration.
- Important details: The required Activity Flex Query uses the **Trades** section, **Last 365 Calendar Days**, XML, `yyyyMMdd`, and `HHmmss`. Token and query ID can be pasted together in either order. The Flex service is read-only and cannot place/cancel orders or move funds. Only completed trades are imported; ambiguous dates are skipped. Multi-currency P&L is stored as reported without conversion. Removing a connection leaves imported trades in the journal.
- Try it: From **Connections**, add **Interactive Brokers**, follow **Set up in IBKR Client Portal**, paste the Flex token and query ID, then verify and connect.

### Story options

- Automatic IBKR trade history through a read-only Flex Query.
- Start with the one-time Client Portal setup, then show how syncing becomes routine.

### Visual moments

- The in-app five-step IBKR setup guide with the required query settings and read-only notice visible.
- The paste field after token/query ID detection, with both values fully redacted or synthetic.
- A saved **Interactive Brokers** connection showing **Sync now**, last sync, and scheduling controls.

### Visual caveats

- Do not expose a Flex token, query ID, IBKR account ID, report contents, or real trade history.
- Live completion depends on IBKR and a correctly configured test Flex Query; use a safe fixture/stub for deterministic capture if available.

## Entry: mobile-form-focus-without-zoom

- User outcome: Focusing a text field on iPhone no longer zooms the whole page and leaves the dashboard enlarged after editing.
- Audience: iPhone and other iOS Safari users entering or editing dashboard data.
- Surfaces: Text inputs, textareas, search/command inputs, and selects across billing cancellation, account suggestions, filters/tags, connection/import forms, sharing, bulk/table editing, trade comments, and web-preview controls.
- Dates: 2026-08-08 → 2026-08-08
- Grouping rationale: A shared mobile typography rule was applied across many otherwise unrelated forms to fix one platform-level interaction problem.
- Important details: Editable fields render at least 16 px at mobile widths, the threshold that avoids iOS Safari focus zoom, while compact desktop sizes remain behind `sm:` breakpoints. This is interaction stability, not a general typography redesign.
- Try it: On an iPhone-sized Safari viewport, focus and blur a compact dashboard field such as an editable instrument or filter search.

### Story options

- Mobile forms stay at the scale you chose.
- Keep it concise and frame it as a broad iPhone usability fix.

### Visual moments

- Before/after-style interaction evidence of the same mobile field focused without the viewport magnifying.
- A compact mobile edit state with keyboard/focus active and surrounding dashboard context still visible.

### Visual caveats

- Desktop browser device emulation may not reproduce Safari's automatic zoom; verify on iOS/WebKit where possible.
- A still image may not prove the absence of zoom. Prefer a short recording or paired viewport evidence, and do not fabricate a browser zoom state.

## Entry: authentication-page-redesign

- User outcome: Sign-in now matches the public site's calmer editorial design, with a split desktop composition, animated trading candlesticks and testimonial context, clearer provider/email actions, and a way to correct an email after requesting a link.
- Audience: New and returning users signing in, registering, or verifying an email code.
- Surfaces: `/{locale}/authentication`; desktop split panel; Google/Discord/email/password controls; email-sent and six-digit code state; **Use a different email**; terms/privacy links.
- Dates: 2026-08-08 → 2026-08-08
- Grouping rationale: Page composition, auth-control styling, OTP behavior, and recovery affordance are one end-to-end authentication redesign.
- Important details: The candlestick/testimonial panel appears at large desktop widths; narrow screens keep the focused form. Six-digit codes verify when complete. The email field locks after a magic-link request, but **Use a different email** returns to editing. Existing Google, Discord, magic-link, code, and optional password paths remain.
- Try it: Open the localized authentication route while signed out, request an email link with a safe test address, and inspect the code/change-email state.

### Story options

- A sign-in page that feels like the product before you enter it.
- Lead with the desktop visual redesign, then show the practical email correction and verification flow.

### Visual moments

- Signed-out desktop authentication page showing the brand, candlestick panel, testimonial, and complete form.
- Email-sent state showing the six code slots, mailbox/resend controls, and **Use a different email**.
- A narrow/mobile viewport demonstrating the simplified single-column form.

### Visual caveats

- Local dashboard auth bypass redirects `/{locale}/authentication` to the dashboard. Disable both server and public bypass flags for authentication captures, then restore bypass for authenticated dashboard scenes.
- Use a synthetic email and do not capture OTPs, sessions, or provider account details. The desktop visual needs a viewport at the `lg` breakpoint or wider.

## Entry: support-assistant-source-first-help

- User outcome: The support assistant investigates product behavior against source files before answering, shows what it is searching/reading, lets users revise an earlier text question, and offers direct human support without trapping escalation inside the model conversation.
- Audience: Visitors and users seeking product help in English or French, especially for detailed workflow or troubleshooting questions.
- Surfaces: `/{locale}/support`; **Support Assistant** header; **Fill out a support request through the form**; chat reasoning/search/read markers; message **Edit**; image attachments; prepared-request **Open contact form**; responsive contact dialog/drawer; Discord link; public navbar **Support** link.
- Dates: 2026-08-08 → 2026-08-10
- Grouping rationale: The refreshed page, source-first tools, visible investigation state, editable conversation, localization, and human handoff combine into one more trustworthy support workflow. It is a meaningful follow-up to `support-assistant-codebase-search`, not a rewrite of that published entry.
- Important details: Behavioral questions are directed through source grep and file reads rather than changelog prose alone. Editing a question removes later replies before resending. Human support can be opened directly from the header or from an assistant-prepared summary; signed-in email may prefill the form. French reasoning headings are translated for the visible UI. Support answers still depend on AI service availability and should not be presented as guaranteed correct.
- Try it: Open **Support**, ask how a specific Deltalytix workflow works, observe the investigation markers, edit the question, then open the support form without sending it.

### Story options

- Support that checks the product before it answers—and always leaves a clear path to a person.
- Organize around trust: source-first investigation, editable questions, then human handoff.

### Visual moments

- A product-specific question with **Searching the codebase…** or **Reading documentation…**, a reasoning block, and the resulting answer in one conversation.
- Edit mode showing the earlier user question, dimmed later replies, **Editing — replies after this message will be removed**, and **Cancel**.
- The refreshed header with its direct support-request action, followed by the responsive contact form with synthetic information.

### Visual caveats

- AI chat requires gateway configuration and can vary between runs; use a deterministic prompt and avoid presenting generated content as fixed product copy.
- Do not actually send the capture request to the support team. Use synthetic contact information and stub email delivery where possible.
- For authenticated email prefilling and other dashboard-adjacent context, bypass can remain enabled; the public support page itself does not require authentication.

## Entry: flexible-connection-sync-schedules

- User outcome: A connection can now synchronize every few minutes or hours, once daily at a chosen local time, or remain manual-only, directly from its Connections row.
- Audience: Traders using Tradovate, DxFeed, Rithmic Protocol, or Interactive Brokers connections.
- Surfaces: **Dashboard → Connections**; underlined next-sync/**Schedule sync** trigger; desktop **How often** menu; mobile **Sync schedule** drawer; daily time presets and **Turn off**.
- Dates: 2026-08-11 → 2026-08-11
- Grouping rationale: Database schedule state, due-time logic, cron execution, countdowns, desktop menu, and mobile drawer implement one flexible automatic-sync capability across supported providers.
- Important details: Recurring choices are every 5, 15, or 30 minutes; every hour; every 4 hours; or every 12 hours. **Once a day** accepts a local time and presets for morning, midday, after close, and midnight. Choosing an option applies immediately; **Turn off** returns the connection to manual sync. Thor and legacy Rithmic are not in the supported scheduled-service list.
- Try it: Expand a supported connection on **Connections**, select its next-sync/schedule link, choose an interval, then reopen it to switch to a daily time or turn it off.

### Story options

- Put each connection on the rhythm that matches how you trade.
- Contrast frequent intraday intervals with the existing daily/manual choices.

### Visual moments

- Desktop schedule menu open with all interval choices and the **Once a day** branch.
- Daily submenu showing a local time, timezone note, and presets.
- Mobile schedule drawer showing the two-column intervals, expanded daily controls, and **Turn off**.

### Visual caveats

- Seed at least one supported connection; do not expose credentials or account identifiers.
- Countdown text is time-sensitive. Freeze or control capture time if fixture infrastructure supports it, and verify provider labels in both locales.

## Entry: rithmic-protocol-primary-connection

- User outcome: New Rithmic connections now use the server-side Rithmic Protocol path by default, with a guided connection-point/system step, searchable systems, inline validation, password visibility, and more reliable fill recovery for LucidTrading accounts.
- Audience: Rithmic traders with valid R | Protocol credentials and entitlements, including affected LucidTrading users.
- Surfaces: **Dashboard → Connections → Add Rithmic Protocol connection**; Rithmic Protocol section and import type; **Connect point**, **Rithmic system**, **Continue**, username/password, **Show password**, **Account start date**, discovered accounts, and sync status.
- Dates: 2026-08-11 → 2026-08-11
- Grouping rationale: Replacing the legacy add surface, redesigning Protocol setup, and fixing zero-fill histories all complete the same transition to Protocol as the primary Rithmic connection workflow.
- Important details: The legacy `rithmic-sync` import option and Connections section are removed from new-connection surfaces; no automatic credential migration is shown in this diff. Protocol still requires deployment endpoints plus valid Rithmic credentials/entitlements. Account start date must be between 2013 and today; history is requested in serial windows of at most 30 days. When fill history returns no data, the client can fall back to order history and uses account-specific FCM/IB metadata, addressing the LucidTrading zero-fill case. Password visibility is user-controlled and must not be exposed in captures.
- Try it: Open **Connections**, add **Rithmic Protocol**, select a connect point and searchable system, continue to credentials/start date, then connect with an entitled test account.

### Story options

- Rithmic's primary connection path is now Protocol, with clearer setup and stronger history recovery.
- Lead with the guided two-step connection; treat LucidTrading reliability as the important completion detail.

### Visual moments

- Step one with **Connect point** selected and the searchable **Rithmic system** picker open.
- Step two showing username, masked password with **Show password**, account start date, and inline guidance, using empty or synthetic values.
- A discovered-account or successful synchronization state from a safe entitled test account, if available.

### Visual caveats

- Capture requires configured Protocol endpoints and entitled test credentials. Never reveal usernames, passwords, account IDs, connect hostnames, FCM/IB identifiers, or tokens.
- Do not imply that every legacy Rithmic account automatically works with Protocol or that old credentials were migrated. If no safe Protocol environment exists, use setup states and text rather than fabricating a successful sync.

## Entry: rithmic-performance-trade-date-import

- User outcome: Traders can upload the current Rithmic Performance CSV format directly instead of deleting its leading **Trade Date** column before import.
- Audience: Rithmic users importing Performance reports as files rather than using the Rithmic Protocol connection.
- Surfaces: **Dashboard → Connections → Upload a file → Rithmic Performance**; file upload and processed-trades preview.
- Dates: 2026-08-11 → 2026-08-11
- Grouping rationale: This is a focused compatibility fix for the separate Rithmic Performance file-import workflow. It should not be folded into `rithmic-protocol-primary-connection`, which covers server-side account synchronization and has different setup, availability, and evidence.
- Important details: Newer reports put **Trade Date** before **Entry Order Number**. The importer now recognizes the trade header wherever **Entry Order Number** appears, retains the leading column so every later field stays aligned, and continues mapping the full entry/exit timestamps. Reports where **Entry Order Number** is still the first trade column remain compatible. This does not change the Rithmic Orders CSV importer or Protocol synchronization.
- Try it: Choose **Rithmic Performance** under **Upload a file** and upload an unedited current-format report containing **Trade Date** before **Entry Order Number**.

### Story options

- Current Rithmic Performance exports work as downloaded.
- Keep the copy concise: no spreadsheet cleanup, correct alignment, legacy format preserved.

### Visual moments

- **Rithmic Performance** selected in the searchable file-import picker, establishing that this is the file workflow rather than Protocol sync.
- The processed-trades preview after uploading a safe current-format CSV, showing the expected account, instrument, and correctly aligned trade values.

### Visual caveats

- Use a synthetic fixture that includes **Trade Date** before **Entry Order Number**; never capture a real report or account number.
- A screenshot of raw CSV text alone does not prove successful import. Prefer the picker plus populated preview; if the leading header is not visible in the product UI, explain the compatibility change in copy rather than fabricating a visible **Trade Date** field.

## Handoff checks

- All 21 commits in `origin/main..origin/beta` are included, covered, or skipped above; multi-surface commit `149b0fd` is deliberately split between the independent DxFeed and Rithmic stories.
- Copy stage should create new EN/FR MDX only for the ten proposed slugs, including the distinct `rithmic-performance-trade-date-import` follow-up, and must not edit any published entry.
- Media stage should independently assess the listed evidence moments. The user prefers rich context and multiple visuals where they materially explain distinct states, but the final count remains a media decision rather than a quota.
- Authentication capture must run with local dashboard bypass disabled; authenticated dashboard captures can restore bypass. All provider credentials, identifiers, emails, and trade data must be synthetic or redacted.
