# Changelog outline: pr-452

## Release window and evidence

- Promotion PR: #452 (`main` ← `cursor/release-beta-to-main-weekly-recap-cb23`, branched from beta at `1084ade4`).
- Window reviewed: `origin/main..HEAD` (14 commits; all dated 2026-08-13). Diff touches weekly newsletter window helpers, weekly-summary send route, cron schedule, and `components/emails/weekly-recap.tsx` (plus supporting types/tests/admin preview defaults).
- Out of scope for this batch: dashboard redesign / #442 — not in this window.
- Related published entries that do **not** cover this work (immutable; leave untouched): `clearer-localized-account-emails`, `landing-weekly-contribution-graph`. No existing `weekly-recap` / `weekly-trading-recap*` slug under `content/updates/`.

## Coverage

- Included: last complete Mon–Sun UTC week window + green-week send gate (`42bc0c38` / #447 `72acc1c9`; `lib/weekly-newsletter-window.ts`, weekly-summary route + user-data) → `weekly-trading-recap-email`
- Included: Sunday 08:00 Lisbon cron schedule on `/api/cron` (`75d9b670`; `vercel.json` `0 7 * * 0` + DST note in `app/api/cron/route.ts`) → `weekly-trading-recap-email`
- Included: weekly recap email visual — shipped Zeno August campaign chrome (`53bd903a` / #450 `1084ade4`; `components/emails/weekly-recap.tsx`) → `weekly-trading-recap-email`
- Included: UTM tags on **Book a call\*** / **Visit dashboard** CTAs (`bb0988cd` / #449 `66de4ce9`) → `weekly-trading-recap-email`
- Included: From address `Deltalytix <newsletter@eu.updates.deltalytix.app>` and continued Newsletter.isActive / unsubscribe gating (weekly-summary route + cron) → `weekly-trading-recap-email`
- Covered: none — no prior changelog entry documents this weekly recap email product story
- Skipped: Paper 9OS-0 intermediate visual lock (`fbb62972`, `9b8db3f9`, `2723b566`, #448 `95bf4686`) — superseded by the Zeno chrome that actually ships; do not invent a separate entry for the intermediate look
- Skipped: vercel.json `_comment` removal (#451 `288dfee5` / `6d798006`) — internal config validity so the cron object parses; the user-facing Sunday timing story is folded into the main entry
- Skipped: `components/emails/email-html.d.ts` Outlook bgcolor/border TS augmentation (`0c5f46c0`) — types only
- Skipped: unit tests (`weekly-recap.test.tsx`, `weekly-newsletter-window.test.ts`) — non-user-facing
- Skipped: admin preview sample props / admin subject string tweaks in `app/[locale]/admin/actions/send-email.ts` — internal admin tooling; live cron subject comes from the weekly-summary API route

## Entry: weekly-trading-recap-email

- User outcome: Newsletter subscribers with an active weekly recap preference can receive a Sunday email summarizing the last complete Monday–Sunday UTC trading week — but only when that week had trades and finished green (net P&L ≥ 0). The message uses a full-bleed Zeno campaign look with Net P&L, week range, wins/losses, win rate, and clear next-step CTAs; red weeks and empty weeks send nothing (no missing-you / consolation mail).
- Audience: Traders opted into weekly trading recaps (`Newsletter.isActive`); EN and FR locales via the subscriber’s language.
- Surfaces: Email template `components/emails/weekly-recap.tsx` (not an in-app route). Labels: **Net P&L** / **P&L net**, **Week of …** / **Semaine du …**, **Wins and losses** / **Gains et pertes**, **Win rate** / **Taux de gains**, **Book a call\*** / **Réserver un appel\***, **Visit dashboard** / **Visiter le tableau de bord**, **Unsubscribe** / **Se désabonner**. Delivery via cron `GET /api/cron` → `POST /api/email/weekly-summary/[userid]`. Unsubscribe: `/api/email/unsubscribe`. From: `Deltalytix <newsletter@eu.updates.deltalytix.app>`.
- Dates: 2026-08-13 → 2026-08-13
- Grouping rationale: One coherent weekly-recap product story — window rules, send gate, schedule, visual chrome, CTAs/UTMs, and from/unsubscribe behavior are how the same email reaches (or deliberately does not reach) the subscriber. Users would not discover these as independent features; splitting would invent separate release notes for one inbox experience.
- Important details:
  - Week window: `getLastCompleteWeekUtc` — last finished Monday 00:00 UTC through the following Monday exclusive (Mon–Sun UTC), not a rolling lookback.
  - Green-week gate: `shouldSendWeeklyRecap` requires `tradeCount > 0` and `netPnL ≥ 0`. Net = pnl − commission, reflected in `thisWeekPnL`. Skip reasons returned as `no_trades` or `negative_net_pnl` with `emailData: null`. Explicitly no missing-you / empty-week / consolation mail from this flow.
  - Cron: `vercel.json` schedule `"0 7 * * 0"` on path `/api/cron`. Route comment: Sunday 08:00 Lisbon; summer WEST (UTC+1) → 07:00 UTC. Winter WET (UTC+0) would need 08:00 UTC — do not claim automatic winter DST adjustment.
  - Visual: full-bleed ~680px email, Geist, dual 22px brand marks, `dm-*` dark/light-aware classes (Zeno August campaign chrome). Intermediate Paper 9OS-0 look was replaced before ship.
  - CTAs append `utm_source=resend&utm_medium=email&utm_campaign=weekly_recap` via `withUtm` (Book a call → Cal.com; Visit dashboard → `/{locale}/dashboard`).
  - Cron recipients still filtered by `Newsletter.isActive`; inactive / missing newsletter throws in user-data and is skipped by cron fetch null handling.
  - Live subject (API route): EN `Your trading statistics for the week 📈` / FR `Vos statistiques de trading de la semaine 📈` — prefer these over admin-preview subject strings when writing copy.
- Try it: Keep newsletter weekly recap active, finish a Mon–Sun UTC week with at least one trade and non-negative net P&L, then check inbox after Sunday ~08:00 Lisbon. Red or empty weeks should produce no recap email. Unsubscribe remains available from the footer / List-Unsubscribe header.

### Story options

- A green-week Sunday recap: only send when the completed Mon–Sun UTC week had trades and finished ≥ 0, with a campaign-styled summary and clear next steps.
- Concise: weekly trading recap email ships with a strict green-week gate, Sunday Lisbon timing, and Zeno chrome — no empty-week consolation mail.

### Visual moments

- Rendered weekly recap HTML (or equivalent static preview) showing Zeno full-bleed chrome, Net P&L hero, week-of range, wins/losses/win rate, and the two CTAs — useful if media wants to show “what lands in the inbox.”
- Optional light vs dark client rendering of the same `dm-*` markup, only if capture can honestly show both without implying two different product emails.

### Visual caveats

- This is primarily an email surface, not an in-app scene; it is not in the usual dashboard capture catalog. Zero visuals is valid if capture cost outweighs clarity.
- Do not screenshot intermediate Paper 9OS-0-only states — they are not what ships.
- Avoid inventing a “missing you” empty-state email visual; that mail is intentionally not sent.
- Sample/admin preview data is not live user data; redact emails and do not imply personal P&L from fixtures.
- Cron timing and DST notes are better as text than as a screenshot.
