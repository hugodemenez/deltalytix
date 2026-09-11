# Changelog outline: pr-515

Promotion PR: #515 (`main` ← `beta`, titled **Promote beta to main**). Head includes `dccb0154` (release-from-beta rule) on top of `e4c44276` (#513). Base `77efa3f7` (v4.1.0 / #501).

## Release window and evidence

- Actual tree window: `git diff origin/main origin/beta` — 17 product files plus the release-workflow rule (`AGENTS.md`, `.cursor/rules/git-workflow.mdc`, `agents/skills/changelog-review/SKILL.md`).
- Commit log `origin/main..origin/beta` is three merged feature PRs plus the promotion-process commit. No leftover squash-merge history from #501.
- Unique commits after #501:
  - `2ca95cca` 2026-09-08 Invalidate trade cache after deleting rows so sync cannot revive them (#510)
  - `2d2d6a79` 2026-09-08 Fix Tradovate sync/CSV duplicate fills from mismatched persisted IDs (#511)
  - `e4c44276` 2026-09-10 Add Tradovate fee settings and first-sync picker on Connexions (#513)
  - `dccb0154` 2026-09-10 Always open beta → main release PRs from beta directly — **Skip** (agent workflow)
- Last production promotion on main: #501 account-payment notice and 16:9 hero demo (`account-payment-renewal-notice`, `landing-hero-16-9-demo` — both immutable). Main also has #504 tryable dashboard footer, #507 Protocol duplicate fills, #508 EUR Plus checkout.

Published entries checked and left untouched include: `account-payment-renewal-notice`, `landing-hero-16-9-demo`, `tradovate-sync-fee-type-options`, `tradovate-sync-current-day-import-guidance`, `tradovate-sync-account-groups`, `tradovate-live-environment-support`, `tradovate-token-status-fix`, `calendar-month-year-and-news-filter`, `dashboard-centered-view-tabs`, `rithmic-protocol-rms-commissions`, `plus-back-to-work-checkout-promo`, `connection-account-mask-rename-delete`.

Every proposed slug below is new under `content/updates/`.

## Coverage

- Included: Tradovate fee gear + first-sync picker on Connections (`e4c44276` #513) → `tradovate-connexions-fee-settings`
- Included: Same Tradovate fill from live sync and weekly CSV no longer stored twice (`2d2d6a79` #511) → `tradovate-sync-csv-same-fill`
- Included: Deleted trade rows stay gone after a later sync/refresh (`2ca95cca` #510) → `deleted-trades-stay-gone`
- Covered: Fee-type checklist on the older Import → Tradovate sync screen → published `tradovate-sync-fee-type-options` (this batch is the Connections follow-up, not a rewrite)
- Covered: Current-trading-day-only sync reminder → published `tradovate-sync-current-day-import-guidance`
- Skipped: `dccb0154` release-from-beta agent rule — internal workflow
- Skipped: `fee-types.ts` helpers, identity hash, `generatePersistedTradeUUID` Tradovate special case, `saveTradesAction` reuse — implementation of the two journal entries
- Skipped: Tests (`fee-types.test.ts`, `identity.test.ts`, `trade-id-utils.test.ts`, `accounts-delete-trades-cache.test.ts`)

## Entry: tradovate-connexions-fee-settings

- User outcome: On [Connections](/en/dashboard/connections), each Tradovate row now has a settings control next to **Sync now**. It opens the fee-type checklist so commission can include exchange / clearing / NFA / brokerage / order routing — not only the broker commission line. If no preference is saved yet, **Sync now**, **Sync all**, or **Choose fees** opens a first-sync picker: illustrative **3 MNQ** round-turn at **Commission only** $2.34 vs **All fees** $5.70. Dismiss / **Skip — use commission only** persists commission-only and does not ask again.
- Audience: Traders with a Tradovate connection on Connections. EN and FR. Not Rithmic / DxFeed / IBKR / IG rows. Not Stripe billing.
- Surfaces:
  - [Connections](/en/dashboard/connections) / [Connexions](/fr/dashboard/connections) — Tradovate section only
  - Gear button `aria-label` **Configure fees** / **Configurer les commissions** (`data-testid="tradovate-fee-settings"`) beside **Sync now** / **Synchroniser**
  - Meta-line **Choose fees** / **Choisir les frais** when `includedFeeTypes` is still unset
  - Picker title **Which fees match your platform?** / **Quels frais correspondent à votre plateforme ?**; description **Example: 3 MNQ, round-turn. Pick the total you expect.** / **Exemple : 3 MNQ, aller-retour. Choisissez le total que vous attendez.**; note **Illustrative example — not a live quote.** / **Exemple illustratif — pas un cours en direct.**; cards **Commission only** / **Commission seule** ($2.34) and **All fees** / **Tous les frais** ($5.70); skip **Skip — use commission only** / **Passer — commission seule**
  - Dialog **Fee config for {account}** / **Config des commissions pour {account}**; lede **Select which fee types to add to each trade's commission. Commission is included by default.**; types EN **Commission**, **Exchange**, **Clearing**, **NFA**, **Brokerage**, **Order routing** / FR **Commission**, **Bourse**, **Clearing**, **NFA**, **Courtage**, **Routage d'ordres**; **Select all** / **Tout sélectionner**, **Deselect all** / **Tout désélectionner**, **Cancel** / **Annuler**, **Save** / **Enregistrer**
  - **Sync all** / **Tout synchroniser** in page chrome also opens the picker once for every unset Tradovate account
- Dates: 2026-09-10 → 2026-09-10
- Grouping rationale: One Connections fee-preference story. Gear, checklist, and first-sync picker are how the same setting is chosen. Do not re-announce the old Import → Tradovate sync checklist (`tradovate-sync-fee-type-options`). Do not fold the journal-integrity fixes into this.
- Important details:
  - Default remains **commission only** (`DEFAULT_INCLUDED_FEE_TYPES`). All-in is opt-in.
  - $2.34 / $5.70 are locked illustrative totals for 3 MNQ, not a live quote and not the user's fills.
  - FR amounts use `fr-FR` currency formatting (`2,34 $US` / `5,70 $US` in current Intl).
  - Skip / outside dismiss persists commission-only so the chooser does not block later syncs. Settings stay available to change it.
  - Old import/sync **Configure fees** dialog is unchanged. This entry is the Connections port plus the picker.
  - Do not claim PnL now matches every prop report by default — only that the trader can include the extra fee lines.
- Try it: Open [Connections](/en/dashboard/connections), find a Tradovate row, use **Choose fees** or the gear next to **Sync now**.

### Story options

- Connections is now where you pick which Tradovate fee lines count, with a first-sync example if you have not chosen yet.
- Concise: Tradovate row gear + **Which fees match your platform?** (commission-only $2.34 vs all-in $5.70).

### Visual moments

- Tradovate row on Connections: gear next to **Sync now**, optional **Choose fees** meta-line.
- First-sync picker open: title, 3 MNQ example, two amount cards, skip.
- Fee config dialog open: checklist + Select all + Save. Distinct from the picker (lasting editor vs one-time chooser).

### Visual caveats

- Local seed is standalone `LOCAL-SIM-001` — no Tradovate OAuth connection. A honest capture needs a capture-only mock Tradovate row (do not persist into product seed).
- Do not photograph the old Import → Tradovate sync credentials manager as if it were this Connections control.
- Do not imply the MNQ $2.34 / $5.70 cards are the viewer's live account.
- EN and FR labels differ (Connections/Connexions, Sync now/Synchroniser, fee type names, currency format).

## Entry: tradovate-sync-csv-same-fill

- User outcome: The same Tradovate fill imported from current-day live sync and later from a weekly movements CSV is stored once. Monday positions no longer appear twice on the calendar or in the trade table.
- Audience: Tradovate users who sync the current day and also import a movements/weekly CSV that includes that day. Follows `tradovate-sync-current-day-import-guidance` without rewriting it.
- Surfaces:
  - Live sync from [Connections](/en/dashboard/connections) (**Sync now**)
  - File import: Tradovate CSV / mouvements (`tradovate-processor`)
  - Result visible on [the dashboard](/en/dashboard) calendar and trade table — no new control
- Dates: 2026-09-08 → 2026-09-08
- Grouping rationale: One cross-source identity story. Do not merge with the Connections fee picker. Do not merge with #510 unless the copy would otherwise repeat; they are independently discoverable (import path vs delete path).
- Important details:
  - Identity is account + unordered fill pair + side. Dates, prices, duration, pnl, and commission are ignored so API vs file values still match.
  - Sync `fill_123` and CSV `123` now collide; older rows with the prefixed id still dedupe a later CSV.
  - Side is normalized (`Long`/`Short` vs `long`/`short`).
  - Already-duplicated historical rows are not auto-deleted. Delete the extra copy if it is already in the journal.
  - Sync is still current trading day only. This does not add history to the API.
- Try it: Sync today's Tradovate account, then import a movements CSV that includes the same day. The overlapping fills should not double.

### Story options

- Sync and the weekly CSV now agree on which fill is which.
- Concise: same Tradovate fill from sync + CSV is one trade.

### Visual moments

- None — the change is the absence of a second row. A before/after would need a staged duplicate that local seed does not have.

### Visual caveats

- Do not fake a doubled calendar day. Text is clearer than a mocked “one row” table.

## Entry: deleted-trades-stay-gone

- User outcome: Deleting trades in the table, then syncing or refreshing another account, no longer brings those rows back. The list was still serving a cached copy; delete now expires it.
- Audience: Anyone who deletes trades and later syncs or refreshes. Reported against Tradovate, but the cache is shared.
- Surfaces:
  - Trade table delete on [the dashboard](/en/dashboard)
  - Any later `force: false` trade read (Tradovate sync, other-account refresh)
  - No new button or copy
- Dates: 2026-09-08 → 2026-09-08
- Grouping rationale: Separate from #511. Users can hit only this path (delete, then refresh) without ever importing a CSV.
- Important details:
  - Hard-delete in Postgres was already correct. The bug was `unstable_cache` tagged `trades-${userId}` (~1h) rehydrating deleted rows.
  - Sibling mutations already expired the tags; trade-by-id delete was the missing call site.
  - Client delete stays optimistic. Do not claim a new confirm dialog.
  - Does not remove duplicates that were already saved as two IDs (#511 is that story).
- Try it: On [the dashboard](/en/dashboard), delete a trade, then sync or refresh another account. The deleted row stays gone.

### Story options

- Deleted trades no longer reappear after the next sync.
- Concise: delete expires the trade cache.

### Visual moments

- None — the change is that a row does not come back. A video of “still gone” is decorative.

### Visual caveats

- Do not stage a revive-then-fix demo. There is no new UI to frame.
