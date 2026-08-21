# Changelog outline: pr-475

Promotion PR: #475 (`main` ← `cursor/release-beta-to-main-changelog-9dc9`).

## Release window and evidence

- Promotion: `origin/main` ← `origin/beta` (`cursor/release-beta-to-main-changelog-9dc9`).
- Window reviewed: `origin/main..origin/beta` — 59 commits, 2026-08-12 through 2026-08-20. Tip at `a30a0051` (#469).
- Last production promotion on main: #452 weekly recap (`weekly-trading-recap-email`, immutable). Main also has post-452 hotfixes not in this beta tip: #460 in-process cron, #462 session replay, #463 consent drawer, **#466 valid Resend reply-to**.
- Out of scope / already on main: weekly recap product story, PostHog replay, consent drawer.
- Release hygiene (not a changelog entry): promoting this beta tip without carrying **#466** would restore `replyTo: '[REDACTED]'` in `lib/weekly-recap-email.ts` and can break Sunday recap sends. Resolve that in the promotion merge; do not document it as a user-facing feature.

Published entries checked and left untouched include: `customizable-dashboard-widgets`, `dashboard-active-filters-in-navbar`, `dashboard-tabs-and-toolbar-small-screens`, `send-feedback-from-the-dashboard`, `billing-payment-history-mobile-layout`, `mobile-widget-minimap-navigation`, `mobile-widget-carousel`, `faster-more-reliable-dashboard-navigation`, `connections-hub-and-streamlined-imports`, `configurable-breakeven-range`, `guided-dxfeed-connection-setup`, `dxfeed-prop-firm-selection`, `ai-csv-field-mapping`, `weekly-trading-recap-email`, `landing-page-redesign`, `landing-page-interaction-polish`, `dark-mode-theme-system`, `dark-localized-link-previews`, `journal-images-tables-tags`, `ai-trading-coach-journaling`.

Every proposed slug below is new under `content/updates/`.

## Coverage

- Included: Dashboard v5/v6 chrome — connections strip, view menu, navbar/toolbar, filters, subpage `← Dashboard | Title`, billing page restyle, add-widget hides placed types (`f2793144`…`dc9e7be2` #442; `a46d6e6b` #458; `e8cf8189` #467; visual locks 2026-08-12–15) → `dashboard-v5-shell`
- Included: Settings v2 page — Account / Linked accounts / Weekly recap / Team / Delete account; Trading Preferences / breakeven UI removed from Settings (`a6799d06`, `b3f6463b` / #446 folded into #442) → `settings-v2-account-page`
- Included: DxFeed connect detects firm from login; username (not email-only) (`0cde6155` #470; `e1e167c6` #473) → `dxfeed-login-detects-prop-firm`
- Included: CSV with AI chunked local parse, honest empty/AI-unavailable failures (`a30a0051` #469) → `csv-ai-chunked-parse`
- Included: EN homepage + crawl copy reframed as a futures trading journal (`597cb99c` #453) → `en-trading-journal-positioning`
- Included: iOS Safari landing status bar / header match canvas gray (`2028923a`…`a8771606` #454) → `landing-ios-safari-canvas-chrome`
- Included: Mindset / daily-comment journal no longer crashes on add; TipTap removed; table insert gone (`e3948691` #461) → `mindset-journal-editor-stability`
- Covered: weekly recap in-process cron (`0266ebde` #457) → `weekly-trading-recap-email` (same fix already on main as #460)
- Covered: vercel.json `_comment` removal (`950ab8ee`) → deploy-config story already absorbed by `weekly-trading-recap-email` / #451 on main
- Covered: restore 390 Widget minimap on the dashboard pill (`f394da26` #465) → `mobile-widget-minimap-navigation` (placement restored after toolbar simplification; count badge too small for a follow-up)
- Skipped: navbar 2–4px top gap (`0889482c` #474) — pixel polish inside the shell pass
- Skipped: Paper/raster visual locks, token nits, sentence-case-only billing label tweaks, unmounted plan-chip / billing-sheet — implementation of `dashboard-v5-shell`, not independent stories
- Skipped: Feedback navbar action removal as its own entry — fold a one-line honesty note into `dashboard-v5-shell`; do not edit `send-feedback-from-the-dashboard`
- Skipped: Copy `.env.local` into Cursor worktrees (`e61a5297`) — internal
- Skipped: localhost `allowedDevOrigins` (`7debdf5c`) — internal
- Skipped: `agents/skills/import-file-parse` — agent tooling
- Skipped: unit tests, seed/dev scripts, generated types, TipTap package deletion as a dependency story

## Entry: dashboard-v5-shell

- User outcome: The signed-in dashboard chrome is rebuilt. Home no longer uses a full-width Widgets/Table/Accounts tab strip under the nav. A compact **view menu** sits in the top bar; a **Connections** strip of provider chips sits under it; filters open from **This week** / **+ Filter** (desktop) or a filter icon (mobile); the bottom pill is layout-only (**Edit** / **Done**, **Add**); Share and **Account** live in the navbar. Connections, Data, Settings, and Billing share `← Dashboard | {Title}` subpage chrome. The billing page is restyled to the same light canvas. The add-widget sheet hides types already on the current viewport layout.
- Audience: Every signed-in dashboard user (Free and Plus). No feature flag.
- Surfaces:
  - `/{locale}/dashboard` — navbar, connections strip, filter controls, floating toolbar pill
  - `/{locale}/dashboard/connections`, `/data`, `/settings`, `/billing` — `← Dashboard | Title` / `← Tableau de bord | {Titre}`
  - Labels EN / FR: **Widgets** / **Widgets**, **Table** / **Tableau**, **Accounts** / **Comptes**; strip aria **Connections** / **Connexions**; **Standalone** / **Autonome**; **Search accounts** / **Rechercher des comptes**; **Manage connection** / **Gérer la connexion**; **Add** / **Ajouter**; date chip **This week** / **Cette semaine**; **+ Filter** / **+ Filtrer**; filter panel **Filters** / **Filtres**, **Clear all** / **Tout effacer**, folded **Date Range** / **Période**, **Accounts** / **Comptes**, **Instruments**, **Tags**, **PnL**; toolbar **Edit** / **Modifier**, **Done** / **Terminé**, **Add** / **Ajouter**; empty add sheet **Every widget type is already on this dashboard.** / **Tous les types de widgets sont déjà sur ce tableau de bord.**; **Account** / **Compte** trigger; **Share**
  - Billing page: **Current plan** / **Offre actuelle**, **Available plans** / **Offres disponibles**, **Billing history**, invoices empty state **No invoices yet** / **Pas de facture pour le moment**
  - Status dots: **Connected** / **Connecté**, **Disconnected** / **Déconnecté**, **Offline** / **Hors ligne**
- Dates: 2026-08-12 → 2026-08-16
- Grouping rationale: One visual/IA redesign shipped as #442 plus v6 QA. Filters, connections strip, toolbar, subpages, and billing restyle are how the same chrome is discovered — not independent product launches. Settings *capabilities* (delete account, weekly recap switch, lost breakeven UI) are a different user job and live in `settings-v2-account-page`.
- Important details:
  - Plan chip and in-navbar billing sheet exist in code but are **unmounted**; billing is Account → **Billing** full page only. Do not screenshot or describe a plan chip that is not in the UI.
  - Navbar **Send feedback** action is gone (`FeedbackButton` unmounted). Do not claim feedback moved; it is simply not in the chrome. Do not rewrite the old entry.
  - Desktop filters: right Sheet. Mobile: bottom Drawer. Active chips pin at the top of the sheet (**Clear all**); mobile home can show a second navbar row of active chips.
  - Filter sections fold one-at-a-time (same pattern as the account drawer). Date chip opens **Date Range**; **+ Filter** opens the collapsed list.
  - Connections strip chips show **connection display names**, not raw account numbers. Selecting an account in the chip picker filters the dashboard to that account (toggle clears). Progressive fetch from `/api/connections/page-data`.
  - Add-widget catalog filters by **current viewport** layout (desktop vs mobile independently).
  - Widget minimap on the mobile pill is the already-published control, restored — mention only if needed for orientation, do not re-announce.
  - Light canvas `#FAFAFA`, flatter white chrome, shorter `h-14` top bar. Do not invent performance claims.
- Try it: Open [the dashboard](/en/dashboard), switch **Widgets** / **Table** / **Accounts** from the view menu, use a connection chip and **+ Filter**, then open Billing or Connections via **Account**.

### Story options

- The dashboard chrome is rebuilt around connections, a compact view menu, and filters in the top bar.
- Concise: new shell (strip + view menu + filter chips + layout pill), with Billing/Connections/Data/Settings sharing back-to-dashboard chrome.

### Visual moments

- Desktop home: logo, view menu, **This week** / **+ Filter**, Share, **Account**; Connections strip under nav; white **Edit | Add** pill.
- Connections strip open: status dot, account count, searchable picker, **Manage connection**.
- Filter sheet: pinned active chips, collapsed sections with ›, one section expanded.
- Mobile ~390: Account drawer, filter drawer, toolbar pill with Edit | Add | minimap stack.
- Subpage: `← Dashboard | Billing` (or Settings) on the light canvas.
- Billing page: **Current plan** + **Available plans** + **Billing history**.
- Add-widget sheet empty state, or a catalog that omits already-placed types.

### Visual caveats

- Seeded local bypass may have few connections; still show Standalone + Add honestly.
- Do not capture unmounted plan chip / billing sheet.
- Do not recapture the old full-width tab strip as if it still ships.
- Consent banner and Next.js dev indicators must be hidden (`CHANGELOG_MEDIA_CAPTURE=1`).

## Entry: settings-v2-account-page

- User outcome: **Settings** is a stacked list: **Account** (email, set password), **Linked accounts** (Google/Discord), **Weekly recap** switch, **Team**, **Sign out**, and **Delete account**. Theme, language, and timezone move to the **Account** navbar menu. **Trading Preferences** / **Breakeven range** controls are no longer on this page (existing browser-stored range still applies to statistics if previously set). **Delete account** permanently wipes trades, connections, billing/Stripe, and the auth user.
- Audience: Every signed-in user managing profile, recap mail, or account deletion.
- Surfaces: `/{locale}/dashboard/settings`; Account menu **Settings**. Labels: **Account** / **Compte**, **Email**, **Password** **Set →** / **Définir →**, **Linked accounts** / **Comptes liés**, **Connected** / **Connecté**, **Connect →** / **Connecter →**, **Weekly recap** / **Récap hebdomadaire** with description **Monday email when last week was green. No mail on a red week.** / **Email le lundi quand la semaine était verte. Pas d'email sur une semaine rouge.** (copy says Monday; delivery cron is Sunday ~08:00 Lisbon — prefer describing the control as opting into the already-shipped weekly recap, and do not invent a Monday send time if it conflicts with `weekly-trading-recap-email`), **Team** / **Équipe**, **Sign out** / **Se déconnecter**, **Delete account** / **Supprimer le compte** plus confirm dialog.
- Dates: 2026-08-12 → 2026-08-15
- Grouping rationale: Settings is a distinct destination with new destructive capability and a recap preference. Visual chrome (`← Dashboard | Settings`) is part of the shell entry; this entry is what you can *do* on the page.
- Important details:
  - Delete account: `deleteCurrentUserAccount` — trades (no User FK, deleted explicitly), connections, Stripe customer/subscriptions (skipped under local auth bypass), Supabase auth user. Irreversible. Confirm title/body/action as labeled. Local dashboard bypass cannot complete Stripe/auth wipe; do not demo a successful production delete in capture.
  - Weekly recap switch writes `Newsletter` preference used by the already-published Sunday green-week email. Do not re-explain send gates; link the recap entry in spirit, not by editing it. If Settings copy says “Monday” and cron is Sunday, copy should follow **product behavior (Sunday Lisbon)** rather than the stale Settings description, or mention the control without repeating a weekday that the code does not honor.
  - Breakeven: `useBreakevenStore` still consumed by statistics, trade distribution, PDF share. **No Settings UI** to change min/max or reset. Previously stored values persist in the browser. Do not edit `configurable-breakeven-range`.
  - Notification toggles and theme-intensity slider are gone from Settings (theme light/dark/system remains in the Account menu).
- Try it: Open [Settings](/en/dashboard/settings) from **Account**. Review **Weekly recap**. Do not complete **Delete account** on a real account.

### Story options

- Settings is now a short account page, including weekly recap and a permanent delete.
- Lead with delete + recap, then note that breakeven is no longer edited here.

### Visual moments

- Settings list on the light canvas: Account, Linked accounts, Weekly recap, Team, Sign out, Delete account.
- Weekly recap row with the switch on.
- Delete confirm dialog (cancel state only — never confirm in capture).

### Visual caveats

- Never confirm deletion; never show real emails beyond the seeded local user.
- Weekly recap weekday copy in the UI may disagree with Sunday cron — do not photograph a Monday claim if the changelog will correct it in prose; or crop to the control name.

## Entry: dxfeed-login-detects-prop-firm

- User outcome: Connecting DxFeed is a single username + password form. Deltalytix detects the prop firm from that login (auth host / `propfirmName`) instead of asking the trader to pick from a catalog. Non-email usernames (for example `trader_ht50`) are valid.
- Audience: Traders at DxFeed/Volumetrica-backed prop firms, including firms that issue non-email logins.
- Surfaces: **Dashboard → Connections → Add → DxFeed**, and the `+` add control on the connections strip. Title **Connect DxFeed Account** / **Connecter un compte DxFeed**. Description: **Sign in with the same username and password you use on your prop firm's DxFeed platform. We detect the firm from that login.** Username placeholder **Username from your prop firm login**. Buttons **Connect** / **Connecting...**. Validation: **Enter your username**, **Enter your password** (no email-format check, no firm-required errors).
- Dates: 2026-08-20 → 2026-08-20
- Grouping rationale: #470 (detect firm, drop catalog step) and #473 (username vs email) are one connect flow.
- Important details:
  - Catalog picker, **Continue**, allowlist, `AUTH_PROP_FIRM_MISMATCH`, and “firm not listed / contact Support to add” empty states are **gone**. Do not describe picking My Funded Futures from a list — that is the immutable `guided-dxfeed-connection-setup` story.
  - Detection: shared DxFeed/Volumetrica auth → `tradingRestReportHost` → display name from auth `propfirmName` or host map (e.g. Hyperticks) or fallback `"DxFeed"`. No allowlist; using DxFeed still does not guarantee every prop firm works.
  - Existing published screenshots of the two-step picker must not be reused as if current.
- Try it: From [Connections](/en/dashboard/connections), add **DxFeed** and review the single credential form. Completing auth needs a real provider endpoint.

### Story options

- Sign in once; we detect the firm.
- Username + password, including non-email logins, replace the prop-firm catalog step.

### Visual moments

- Single-step DxFeed connect dialog: Username + Password, no firm picker, **Connect**.
- Optional: a saved connection card showing a detected firm name after a successful (or mocked) connect — only if capture can do that honestly.

### Visual caveats

- Never capture real credentials. Empty fields are enough to prove the form change.
- Local bypass cannot complete live DxFeed auth. Do not fake a success state in product code; capture-only mocks may live under `scripts/changelog-media/` if needed.
- Do not show the old two-step picker.

## Entry: csv-ai-chunked-parse

- User outcome: **CSV with AI** infers a parse plan once, then formats the file locally in 2500-row chunks with row progress. Large files no longer depend on a green “all batches completed” state while showing zero trades. Missing OpenAI configuration fails closed with a clear alert instead of a false success. Review copy explains whether columns were parsed, orders were paired, or columns still need mapping.
- Audience: Traders importing broker CSVs via **CSV with AI** (including self-host without an API key).
- Surfaces: Connections / import → **CSV with AI** → **Review Trades** (`format-preview.tsx`). Labels: `{formatted} trades formatted`; `{processed} of {total} rows`; **Parsed from the file columns**; **Order fills were paired into trades**; **Ready to import**; **Parsing**; **Unable to format trades**; **AI formatting is unavailable. Ask your administrator to configure an OpenAI API key, then try again.**; **No trades were formatted…**; **Map these columns to continue: {columns}**; **No trades to review yet**; preview cap **Showing first {count} of {total} trades**.
- Dates: 2026-08-20 → 2026-08-20
- Grouping rationale: One import reliability story. Not a rewrite of 2024 `ai-csv-field-mapping`.
- Important details:
  - Plan inferred from headers + ≤8 sample rows; execution is local (`lib/import/parse-plan.ts`). Chunk size 2500. Papa still loads the full CSV — do not claim unbounded streaming of multi-million-row files.
  - Dummy/missing OpenAI: red failure, not `0 of N trades formatted` success.
  - Follow-up to `ai-csv-field-mapping`; do not edit that entry.
- Try it: Import a CSV with **CSV with AI**. On a server without `OPENAI_API_KEY`, expect the unavailable alert. With a mapped file, watch row progress and **Ready to import**.

### Story options

- CSV with AI now parses in chunks and tells the truth when AI is missing.
- Concise reliability: no more empty-batch success; large files show row progress.

### Visual moments

- Review Trades after a successful header-mapped parse: **Parsed from the file columns** / **Ready to import**.
- AI-unavailable alert (honest with dummy key).
- Optional: in-progress `{processed} of {total} rows` on a larger fixture.

### Visual caveats

- Happy path may work from headers alone without a live OpenAI call; dummy-key capture is the failure path.
- Do not imply every broker CSV maps perfectly.

## Entry: en-trading-journal-positioning

- User outcome: English homepage hero and crawl/social metadata now describe Deltalytix as a **trading journal for futures traders**, not a generic “trading analytics dashboard.” H1: **One trading journal for every futures account.** Subhead: **Import your brokers and funded accounts, then read P&L in one place.** Document title: **Deltalytix — The Trading Journal for Futures Traders.** FR hero/metadata are unchanged.
- Audience: EN visitors, Search, and social unfurls. Not a dashboard change.
- Surfaces: `/en` hero (`landing.title` / `landing.description`); `<title>` / meta description; OG/Twitter via `lib/og/site-metadata.ts`, `app/opengraph-image.tsx`, `app/opengraph-image.alt.txt`.
- Dates: 2026-08-15 → 2026-08-15
- Grouping rationale: One positioning/copy commit. Follow-up to `landing-page-redesign` / `dark-localized-link-previews` without rewriting them.
- Important details: FR remains **Votre journal de trading.** / existing FR description. Do not claim a bilingual hero rewrite. OG image layout is the existing dark card; headline/subhead/alt carry the journal framing.
- Try it: Open [the English homepage](/en) and read the hero.

### Story options

- The English homepage now leads with the futures trading journal framing.
- Concise: new EN H1 + search/OG copy; FR unchanged.

### Visual moments

- EN landing first viewport: new H1 and subhead.
- Optional OG card only if it visibly carries the new headline (otherwise text is enough).

### Visual caveats

- Do not photograph FR as if it changed.
- Existing `landing-page-redesign` media stays on that entry.

## Entry: landing-ios-safari-canvas-chrome

- User outcome: On iOS Safari, the status bar and landing header match the page canvas (`#f5f5f5` light / `#0f0f0f` dark) so the first paint does not show a white or black seam, including after a theme toggle.
- Audience: Mobile Safari visitors on the public homepage (especially dark mode).
- Surfaces: Landing `html`/`body` `canvas-bg`; static `theme-color` metas in `app/layout.tsx` via `CANVAS_THEME_COLOR`. Final approach is **static** light/dark metas only (JS theme-color sync was removed).
- Dates: 2026-08-14 → 2026-08-15
- Grouping rationale: Fold the #454 series (`2028923a`, `44a2316d`, `65d7ae6c`, `8b2c90c8`, `a8771606`) into one iOS chrome story.
- Important details: Dashboard later disabled a related sampler (#474); landing keeps this canvas `theme-color`. Do not claim Android/Chrome parity beyond standard `theme-color` support.
- Try it: Open the homepage in iOS Safari, toggle light/dark, and check the status bar against the header.

### Story options

- iPhone Safari chrome now matches the landing canvas in light and dark.
- Concise status-bar follow-up to the landing/dark-mode work.

### Visual moments

- iPhone Safari dark: status bar + header + canvas as one charcoal strip.
- Light: the same in light gray.

### Visual caveats

- Honest capture needs iOS Safari (or a simulator that shows `theme-color`). A desktop Chromium screenshot of the landing hero does **not** prove this claim. Prefer **zero visuals** if iOS capture is unavailable.

## Entry: mindset-journal-editor-stability

- User outcome: Adding the **Mindset** widget (and editing calendar **daily comments**) no longer crashes. Journals use a lighter contenteditable editor: headings, lists, quote, image, AI menu, fullscreen. **Table insert is not offered.**
- Audience: Traders using Mindset or calendar day comments.
- Surfaces: Mindset widget journal pane; `components/journal-editor/*`; calendar `daily-comment.tsx`.
- Dates: 2026-08-15 → 2026-08-15
- Grouping rationale: Reliability fix plus an honest limitation versus `journal-images-tables-tags`. One short entry; do not re-announce journaling, images, or tags.
- Important details: TipTap / yjs removed. Previously announced table creation and image-corner resize from `journal-images-tables-tags` are not provided by this editor. Existing journal HTML may still render if present; new tables cannot be inserted from the toolbar. Crash context in the PR was local production when adding Mindset — do not invent a global outage.
- Try it: On [the dashboard](/en/dashboard), **Add** Mindset and open the journal pane.

### Story options

- Mindset journals open without crashing, on a simpler editor (no table insert).
- Concise reliability note with the table limitation.

### Visual moments

- Mindset journal open with the new toolbar (headings/lists/image, no table control).
- None is valid — the crash is hard to show honestly, and the toolbar change is small.

### Visual caveats

- Do not stage a crash screenshot. Do not reuse TipTap table UI from the old entry.
