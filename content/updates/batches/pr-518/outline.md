# Changelog outline: pr-518

Promotion PR: #518 (`main` ← `beta`, titled **Promote beta to main**). Head is `beta` directly. Base `1f05079d` (Promote beta to main #515 / production v4.1.0 plus later main-only promotions).

## Release window and evidence

- Actual tree window: `git diff origin/main origin/beta` — 38 files.
- Unique commits after #515:
  - `2ca95cca` 2026-09-08 Invalidate trade cache after deleting rows so sync cannot revive them (#510)
  - `2d2d6a79` 2026-09-08 Fix Tradovate sync/CSV duplicate fills from mismatched persisted IDs (#511)
  - `e4c44276` 2026-09-10 Add Tradovate fee settings and first-sync picker on Connexions (#513)
  - `dccb0154` 2026-09-10 Always open beta → main release PRs from beta directly — **Skip** (agent workflow)
  - `7de13f10` 2026-09-10 Add pr-515 changelog for Tradovate fees and journal integrity
  - `156bada8` 2026-09-10 Add capture scene for Connections Tradovate fee config
  - `6f3f9416` 2026-09-10 Wire pr-515 fee-config screenshots into EN/FR changelog
  - `c9e5c6bd` 2026-09-16 Weekly recap blurb: Luna High + honest 1-day week prompts (#516)
- Last production promotion on main: #515. Main also already has #504 tryable dashboard footer, #507 Protocol duplicate fills, #508 EUR Plus checkout. Those published entries stay immutable.

The EN/FR files `tradovate-connexions-fee-settings`, `tradovate-sync-csv-same-fill`, and `deleted-trades-stay-gone` (plus `batches/pr-515/` and fee-config captures) already exist on `beta` and are **not** on `main`. They were drafted against the previous promotion number after #515 merged. Leave those files untouched. They ship with #518 as already-written copy.

Published on `main` and left untouched include: `weekly-trading-recap-email`, `tradovate-sync-fee-type-options`, `tradovate-sync-current-day-import-guidance`, `tradovate-sync-account-groups`, `tradovate-live-environment-support`, `tradovate-token-status-fix`, `account-payment-renewal-notice`, `landing-hero-16-9-demo`, `rithmic-protocol-rms-commissions`, `plus-back-to-work-checkout-promo`.

Every proposed slug below is new under `content/updates/`.

## Coverage

- Covered: Tradovate fee gear + first-sync picker on Connections (`e4c44276` #513) → existing `tradovate-connexions-fee-settings` (already on beta; do not edit)
- Covered: Same Tradovate fill from live sync and weekly CSV (`2d2d6a79` #511) → existing `tradovate-sync-csv-same-fill` (already on beta; do not edit)
- Covered: Deleted trade rows stay gone after a later sync (`2ca95cca` #510) → existing `deleted-trades-stay-gone` (already on beta; do not edit)
- Included: Weekly recap coaching paragraph states one-day / thin weeks honestly (`c9e5c6bd` #516) → `weekly-recap-honest-one-day-weeks`
- Covered: Green-week-only Sunday recap, Net P&L / Daily / Wins and losses chrome → published `weekly-trading-recap-email` (this batch is copy honesty, not a rewrite of send rules)
- Skipped: `dccb0154` release-from-beta agent rule — internal workflow
- Skipped: Changelog capture recipe / scene / screenshots for the already-written Connections fee entry (`156bada8`, `6f3f9416`, `scripts/changelog-media/*`, `public/updates/pr-515/`)
- Skipped: `WEEKLY_ANALYSIS_MODEL` / Luna High / `WEEKLY_ANALYSIS_REASONING_EFFORT` — model swap behind the same email paragraph; not a trader-facing control
- Skipped: Optional `WEEKLY_ANALYSIS_MODEL` env override — ops, not product
- Skipped: Tests (`weekly-recap-analysis.test.ts`, `analysis.test.ts`, fee/identity/cache tests already belonging to covered entries)

## Entry: weekly-recap-honest-one-day-weeks

- User outcome: In the Sunday [weekly trading recap](/en/updates/weekly-trading-recap-email), the generated paragraph under **Net P&L** / **P&L net** no longer invents a week-long ramp from a single session. A one-day week is named as one session / one day. Day-to-day or “shape of the week” language appears only when at least two days have real P&L variation. Coaching tips under that recap stay tied to the data (one day is not a week-long trend) and may still name a Deltalytix tool when it fits.
- Audience: Newsletter subscribers with the weekly recap preference on, in EN or FR. Same green-week gate as before (trades + net P&L ≥ 0). Not the dashboard, not the account-payment reminder, not Plus billing.
- Surfaces:
  - Sunday email subject *Your trading statistics for the week 📈* / *Vos statistiques de trading de la semaine 📈*
  - Paragraph immediately under the **Net P&L** / **P&L net** heading (`resultAnalysisIntro`)
  - Later coaching sentence (`tipsForNextWeek`) above **Book a call*** / **Réserver un appel***
  - Disclaimer unchanged: **This recap is generated automatically and may contain errors.** / **Ce récapitulatif est généré automatiquement et peut contenir des erreurs.**
  - Send window and opt-in unchanged: ~Sunday 08:00 Lisbon, last complete Mon–Sun UTC week, from `newsletter@eu.updates.deltalytix.app`
- Dates: 2026-09-16 → 2026-09-16
- Grouping rationale: One recap-copy honesty story. Do not re-announce green-week-only delivery (`weekly-trading-recap-email`). Do not mention the model name. Do not fold Tradovate / delete-cache work into this.
- Important details:
  - Production already sends only that recap week’s daily P&L. The prompt no longer pretends a previous-week series exists.
  - Single-day weeks must not use “started soft”, “ramped up”, “commencé doucement”, “monté en puissance”, or an invented escalation.
  - Vague motivational fluff without numbers (“positive energy”, “énergie positive”) is out of the prompt.
  - Intro cap stays 60 words; tip cap stays 36 words.
  - Fallback copy when generation fails is unchanged: “Here are your trading statistics for the week.” / “Voici vos statistiques de trading de la semaine.”
  - Empty series never calls the model (and empty/red weeks still do not send).
  - Admin weekly-recap preview uses the same generator; it is not a user surface for this entry.
  - Do not claim the recap is now always accurate — the disclaimer stays. Do not invent metrics on how often 1-day weeks occur.
- Try it: Keep the weekly recap preference on. After a green Mon–Sun UTC week — including a week with only one session — read the paragraph under **Net P&L** in the Sunday mail. Unsubscribe remains in the footer.

### Story options

- The recap now says when the week was really one session, instead of inventing a ramp.
- Concise: one-day weeks are named as one day; shape language only when the daily P&L supports it.

### Visual moments

- None required — the change is the wording of a generated paragraph. A still of the existing recap chrome would not prove honesty.
- Optional candidate: a 1-day-week recap sample with an honest intro under **Net P&L**. Only if a capture can be produced without inventing a live send or a fake “before” bug.

### Visual caveats

- Local bypass has no Resend send and no live subscriber week. Do not modify product email code for screenshots.
- Reusing `/updates/pr-452/.../weekly-recap-sample.png` would show old recap chrome, not this copy change.
- Admin preview is internal. Do not photograph it as if it were the subscriber inbox.
- EN and FR intros differ; any sample must be localized.
