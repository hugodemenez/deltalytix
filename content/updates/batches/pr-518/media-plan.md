# Changelog media plan: pr-518

This batch ships three already-written entries from `batches/pr-515/` plus one new slug. Covered-entry media was already decided in [`batches/pr-515/media-plan.md`](../pr-515/media-plan.md) and must not be recaptured, rewired, or rewritten. Published `weekly-trading-recap-email` media stays on `pr-452` and is also left untouched.

No recipe. No capture. The only new entry is text-only.

## tradovate-connexions-fee-settings

- Decision: 1 visual (already shipped; do not redo)
- Rationale: Media was already decided in `batches/pr-515/media-plan.md` and must not be redone. The Connections **Fee config** dialog is the lasting surface; one clipped still already proves types, commission-only default, and **Select all** / **Save**. Assets live at `/updates/pr-515/{en,fr}/tradovate-connexions-fee-settings.png` and are already wired in EN/FR MDX (`image:` plus body). Recapture would replace published evidence.
- Primary/card asset: existing `/updates/pr-515/en/tradovate-connexions-fee-settings.png` (FR twin under `/updates/pr-515/fr/`) — scene `tradovate-connections-fee-config`. Do not recapture.
- Additional assets: none.
- Omitted candidates: unchanged from `batches/pr-515/media-plan.md` (first-sync picker, full Connections page, old Import checklist, `connections-hub`). Do not add them now.

## tradovate-sync-csv-same-fill

- Decision: 0 visuals (already decided; do not redo)
- Rationale: Media was already decided in `batches/pr-515/media-plan.md` and must not be redone. The claim is that a second row is *not* created. Local seed still has no Tradovate sync+CSV pair. A mocked “one row” table would not prove cross-source identity. Keep the entry text-only; do not add `image:` or body media.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates: unchanged from `batches/pr-515/media-plan.md` (calendar day with a single P&L; before/after duplicate). Do not invent those now.

## deleted-trades-stay-gone

- Decision: 0 visuals (already decided; do not redo)
- Rationale: Media was already decided in `batches/pr-515/media-plan.md` and must not be redone. The claim is that a deleted row stays gone after a later sync. A still of an empty table, or a video of “still gone,” is decorative. Keep the entry text-only; do not add `image:` or body media.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates: unchanged from `batches/pr-515/media-plan.md` (trade table after delete; sync toast). Do not invent those now.

## weekly-recap-honest-one-day-weeks

- Decision: 0 visuals
- Rationale: The claim is generated wording under **Net P&L** / **P&L net** — a one-day week is named as one session, and shape language is allowed only when daily P&L supports it. Copy already states that. A screenshot only proves it if the frame shows the *model’s* paragraph for a real one-day week. Local dashboard bypass cannot send Resend mail and has no live subscriber week. `resultAnalysisIntro` / `tipsForNextWeek` are LLM strings; photographing the React Email template with a hand-written “one session” intro would be me composing the proof and inventing a send. That is not honest evidence of the prompt change. Chrome of the same letter already shipped under `weekly-trading-recap-email`. Fallback copy is unchanged and would not prove honesty either. Zero visuals; do not add `image:` or body media paths to the new MDX.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - Optional 1-day-week recap sample with an honest intro — no live send; a capture-only HTML mock would invent both the week and the generated paragraph. Forbidden by the outline (no invented send, no fake “before” bug).
  - Reusing `/updates/pr-452/{en,fr}/weekly-recap-sample.png` — old recap chrome and a multi-day mock week (+875€, 3–9 Aug). It does not show this copy change and must not be wired as proof of honesty.
  - Admin weekly-recap preview (`/admin` send-email / weekly-recap actions) — internal generator UI; must not be photographed as the subscriber inbox.
  - Rendering `TraderStatsEmail` the way `renewal-notice-email` renders Paper props — that pattern is valid for *locked* template chrome. Here the evidence is a free-form model paragraph, not a locked string. Hand-filling `resultAnalysisIntro` is circular.
  - Settings **Weekly recap** / **Récap hebdomadaire** switch (`settings-account-list`) — preference chrome, not the Sunday paragraph.
  - Dashboard calendar with a single green day — wrong surface; this entry is inbox copy, not widgets.
  - Before/after invented ramp vs honest intro — would require staging the old “started soft” / “ramped up” bug. Do not invent a fake before.

## weekly-trading-recap-email

- Decision: 1 visual (already published; do not redo)
- Rationale: Covered only so this plan is complete. This batch is copy honesty for one-day / thin weeks, not a rewrite of green-week-only send rules or recap chrome. Media was already decided in `batches/pr-452/media-plan.md` (`weekly-recap-sample.png`). Do not recapture, do not rewire the published MDX, and do not reuse that asset on `weekly-recap-honest-one-day-weeks`.
- Primary/card asset: existing `/updates/pr-452/en/weekly-recap-sample.png` (FR twin under `/updates/pr-452/fr/`). Leave it on the published entry only.
- Additional assets: none.
- Omitted candidates: unchanged from `batches/pr-452/media-plan.md`. Do not add a new recap chrome shot in this batch.
