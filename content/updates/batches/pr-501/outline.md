# Changelog outline: pr-501

Promotion PR: #501 (`main` ← `beta`, titled **Beta**). Head `ac89bed4`, base `c0772707` (#498).

## Release window and evidence

- Actual tree window: `git diff origin/main origin/beta` — 175 files. Most of that is third-party skill un-vendoring, Remotion promo source under `videos/`, and Cursor Cloud / CI / docs.
- Commit log `origin/main..origin/beta` still lists the pre-#498 history because #498 squash-merged the previous beta tip; those commits are **Covered** by published `pr-475`, `pr-488`, and `pr-498` entries and must not be rewritten.
- Unique product files after #498 (exclude `agents/skills/better-*`, `.claude/.cursor` better-* symlinks, and `videos/`):
  - `app/[locale]/(landing)/components/hero.tsx` — 16:9 demo frame; consent prompt moved out of the heading row
  - `public/videos/demo_{dark,white}.{mp4,png}` — new Remotion-cut hero clips and posters
  - `components/consent-record.tsx` — xl+ uses a fixed card; drawer mounts only below `1280px`
  - `components/emails/renewal-notice.tsx`, `lib/renewal-notice-copy.ts`, `app/api/cron/renewal-notice/route.ts` — Paper account-payment notice
  - `app/[locale]/admin/actions/send-email.ts` — admin preview defaults / subject strings (not the live subject)
- Unique commits after #498 that actually change the tree vs main:
  - `9512bc34` 2026-08-29 Add Remotion promo cuts for ads and the landing hero (#490)
  - `7f3def0b` 2026-08-31 fix(consent): don't mount 390 drawer on desktop (#500)
  - `ac89bed4` 2026-08-31 Restyle account-payment renewal notice to Paper chrome (#503)
  - `3e8b7c72` 2026-08-29 fix(landing): drop Date.now() from pricing prerender (#499) — **not in the file diff**; already identical on main
  - `580026d1` / `6513f07b` (#502) — merge main into beta
- Last production promotion on main: #498 calendar chips / view tabs / Protocol RMS commissions / Back to Work (`calendar-month-year-and-news-filter`, `dashboard-centered-view-tabs`, `rithmic-protocol-rms-commissions`, `plus-back-to-work-checkout-promo` — all immutable).

Published entries checked and left untouched include: `calendar-month-year-and-news-filter`, `dashboard-centered-view-tabs`, `rithmic-protocol-rms-commissions`, `plus-back-to-work-checkout-promo`, `clearer-localized-account-emails`, `weekly-trading-recap-email`, `landing-page-redesign`, `landing-page-interaction-polish`, `faster-landing-page`, `futures-journal-compare-hub`, `deepcharts-csv-import`, `connection-account-mask-rename-delete`, `rithmic-protocol-live-balances`, `public-404-and-llms-txt`, `dashboard-v5-shell`, `settings-v2-account-page`.

Every proposed slug below is new under `content/updates/`.

## Coverage

- Included: Paper restyle of the prop-firm account payment reminder (`ac89bed4` #503) → `account-payment-renewal-notice`
- Included: New 16:9 landing-hero demo clips and posters (`9512bc34` #490 `hero.tsx` + `public/videos/demo_*`) → `landing-hero-16-9-demo`
- Covered: Calendar month/year + News chip, centered view tabs, Protocol RMS commissions, Back to Work checkout → published `pr-498` slugs
- Covered: Pre-#498 dashboard v5/v6, Settings v2, compare hub, DeepCharts, connection-account actions, Protocol live balances, public 404 → published `pr-475` / `pr-488` slugs
- Skipped: Desktop consent card vs 390 drawer (`7f3def0b` #500) and moving `ConsentRecordPrompt` out of the hero heading row — polish of the consent drawer already on main (#463). After a visitor accepts cookies, the heading layout is effectively unchanged. Too small for a follow-up
- Skipped: Remotion promo compositions, SFX, and ad cuts under `videos/` (#490 except the landing `demo_*` files) — ads are not a product surface
- Skipped: Third-party skill un-vendoring, `skills-lock.json`, `bun run skills:install`, `marketing-email-chrome` skill — internal agent tooling
- Skipped: Rithmic Protocol CI workflow, Tailscale / Cloud Agent `environment.json`, `AGENTS.md` / README docs — internal
- Skipped: `3e8b7c72` #499 pricing `Date.now()` — not present in the unique tree
- Skipped: `580026d1` / `6513f07b` #502 — integration merge
- Skipped: Admin send-email preview defaults (`userFirstName: Hugo`, `LOCAL-SIM-001`, subject label **Account payment**) — internal preview; live subject is `copy.subject` from `buildRenewalNoticeCopy`
- Skipped: Tests for renewal copy / email HTML — implementation of `account-payment-renewal-notice`

## Entry: account-payment-renewal-notice

- User outcome: The scheduled prop-firm **account payment** reminder is no longer the old “Account Renewal Notice / Upcoming Renewal - {account}” letter. It now reads as **{Firm} payment in {n} days.** (or **{Firm} payment tomorrow.** when n=1), with a Paper mint calendar that marks today, the payment day, and the days between. Greeting uses the newsletter first name (or **Trader**), not the email local-part. Actions are **Change reminder** and **Turn off this notice** (both currently open [the dashboard](/en/dashboard)); unsubscribe still goes to [notification settings](/en/settings/notifications).
- Audience: Traders who have a prop-firm account with **Renewal Notice Days** set and a `nextPaymentDate` in that window. EN and FR. Not the weekly recap. Not Stripe Plus billing.
- Surfaces:
  - Inbox only (cron `GET /api/cron/renewal-notice`). From: `Deltalytix Renewals <renewals@eu.updates.deltalytix.app>`
  - Subject = H1 = preview: EN `{Firm} payment in {n} days.` / `{Firm} payment tomorrow.` — FR `Paiement {Firm} dans {n} jours.` / `Paiement {Firm} demain.`
  - Labels EN / FR: kicker **Account payment** / **Paiement du compte**; greeting **Hi {firstName},** / **Bonjour {firstName},**; lede **Auto-renew monthly is set at the firm.** / **Le renouvellement automatique mensuel est réglé auprès de la prop firm.**; **Firm** / **Prop firm**; **Account** / **Compte**; caption **{n} days left** / **Plus que {n} jours** (n=1: **1 day left** / **Plus qu'un jour.**); quiet line about changing or turning off the notice; CTAs **Change reminder** / **Modifier le rappel**, **Turn off this notice** / **Désactiver cet avis**; footer **Unsubscribe from renewal notifications** / **Se désabonner des avis de paiement de compte**; sign-off **Hugo** / **Deltalytix**
  - Calendar: month name of *today* (EN **September** / FR **Septembre** in the locked sample); weekday initials `M T W T F S S` (not localized); today = filled circle; payment day = outlined circle; in-between = wash
  - In-app reminder still lives on the prop-firm account as **Renewal Notice Days** / **Jours de Préavis de Renouvellement** — this entry does not change that control
- Dates: 2026-08-31 → 2026-08-31
- Grouping rationale: One inbox story. Copy, calendar, CTAs, first-name resolution, and cron subject are how the same notice lands. Do not split EN/FR. Do not fold weekly recap or Stripe Back to Work into this. Follow-up to `clearer-localized-account-emails` (that entry only said the old body was no longer empty) without rewriting it.
- Important details:
  - Lede is locked to monthly auto-renew wording. `paymentFrequency` is still passed but **Frequency** / **Next Payment** rows are gone. Do not claim the lede tracks quarterly/annual.
  - First name: `Newsletter.firstName` if it is a non-email string; otherwise **Trader**. Do not greet with `user@` local-parts.
  - Sample / admin preview uses Apex / `LOCAL-SIM-001` / 2026-09-05 → 2026-09-12 (7 days). That is fixture data, not a live user.
  - Both action links currently point at `/dashboard`, not a deep link to the account editor. Unsubscribe: `/settings/notifications`.
  - Fluid 100% width Paper chrome (`#F7F7F4`, mint panel `#EFF5EC`, Geist). No 680px inner lock. Dark-mode `dm-*` classes exist; do not imply two different product emails.
  - Cron still sends one email per account in the notice window. Multiple accounts → multiple emails.
  - Do not invent a new reminder schedule or claim the notice days control changed.
- Try it: On [Accounts](/en/dashboard) (or the account editor), keep **Renewal Notice Days** set. When the next payment date enters that window, the new letter arrives. **Change reminder** / **Turn off this notice** open [the dashboard](/en/dashboard). Unsubscribe from the footer.

### Story options

- The prop-firm payment reminder now says when the firm is due, with a calendar from today to that day.
- Concise: **Account payment** / **Paiement du compte** — `{Firm} payment in n days`, Paper calendar, **Change reminder**.

### Visual moments

- Rendered EN (and FR) HTML of the locked sample: kicker, **Hi Hugo,**, **Apex payment in 7 days.**, mint panel with Firm / Account, September calendar (today + range + payment), **7 days left**, **Change reminder** + **Turn off this notice**.
- That single frame is the whole claim. A second crop of only the calendar would repeat it.

### Visual caveats

- Email surface, not an in-app scene. Admin `/admin/send-email` is internal and may be auth-gated; prefer rendered React Email HTML (same fixtures as the tests) over a live inbox.
- Do not photograph the old **Manage Account** / **Contact Support** / **Upcoming Renewal** letter.
- Do not imply the Apex / LOCAL-SIM-001 sample is a real account.
- Dark-client `dm-*` rendering is optional and must not look like a second product email.
- Weekly recap chrome (`weekly-recap-sample.png`) must not stand in for this notice.

## Entry: landing-hero-16-9-demo

- User outcome: The public homepage hero demo is a **16:9** product clip in the mint frame (was ~2108×1080 ultrawide). Light and dark themes each have a new Remotion-cut loop (`/videos/demo_white.mp4`, `/videos/demo_dark.mp4`) and matching posters. Heading, **Get Started**, and **Features ↓** are unchanged.
- Audience: Anyone on [the homepage](/en) / [the French homepage](/fr). Not signed-in dashboard chrome.
- Surfaces:
  - Hero video on `/{locale}` — `aria-label` from `landing.demoVideo`
  - Frame: `aspect-video` inside the existing mint well (`oklch(0.88 0.04 165)`), rounded clip, light/dark posters until the deferred video loads
- Dates: 2026-08-29 → 2026-08-29
- Grouping rationale: One hero-demo story. New files and the aspect-ratio change are the same first-viewport refresh. Do not re-announce the landing redesign, Features scroll, or AI coach demo. Do not include the skipped desktop consent card — capture always dismisses cookies, and returning visitors never see it.
- Important details:
  - Same lazy-load / poster-to-video behavior as `faster-landing-page`. Do not claim a new loading strategy.
  - Do not describe Remotion, ad cuts, or `videos/src/promo` as a user feature.
  - Do not invent what the clip “shows” beyond a product demo in the hero frame. Watch the shipped files if copy names widgets.
  - Follow-up to `landing-page-redesign` / `landing-page-interaction-polish` without rewriting them.
- Try it: Open [the homepage](/en) (or [the French homepage](/fr)) and watch the hero demo; switch theme to see the dark cut.

### Story options

- The homepage demo now fills a 16:9 frame with a new product loop.
- Concise: mint hero well is 16:9; new light/dark demo clips.

### Visual moments

- First viewport: updates link, H1, lede, **Get Started** / **Features ↓**, then the mint well with a 16:9 demo (not the old ultrawide crop).
- Optional short MP4 of the new loop playing — only if a still of the poster/frame is not enough to show the footage change.

### Visual caveats

- Existing `landing-hero` scene dismisses consent (correct). Do not leave the consent card in the shot unless a separate consent entry is added (it is not).
- Capture EN and FR independently (H1 / CTA locale).
- Light theme is the default card; dark is only needed if copy claims both cuts.
- Do not reuse `landing-page-redesign.png` (ultrawide-era) as if it were this frame.
- Wait for the video or a settled poster; do not ship a broken “Failed to load video” state.
