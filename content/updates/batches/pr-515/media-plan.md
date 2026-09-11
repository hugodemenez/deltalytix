# Changelog media plan: pr-515

## tradovate-connexions-fee-settings

- Decision: 1 visual
- Rationale: The lasting claim is the Connections **Fee config** dialog — types, default commission-only, **Select all** / **Save**. One clipped still of that dialog on a Tradovate row proves the new surface faster than prose. A second shot of the first-sync picker would restate the same preference with illustrative $2.34 / $5.70 cards; copy already names those totals. Video of opening the gear is a static dialog.
- Primary/card asset: `tradovate-connexions-fee-settings.png` — new scene `tradovate-connections-fee-config`. Desktop Connections, capture-only Apex row injected via `/api/connections/page-data` (seed has no Tradovate OAuth). Click the gear (`tradovate-fee-settings`). EN expects **Fee config for Apex**, **Commission**, **Select all**, **Save**. FR expects **Config des commissions pour Apex**, **Commission**, **Tout sélectionner**, **Enregistrer**. Commission checked; other types unchecked.
- Additional assets: none.
- Omitted candidates:
  - First-sync picker (**Which fees match your platform?**) — one-time chooser; the dialog is the control users keep. Picker also depends on the Tradovate sync store, not page-data.
  - Full Connections page with the gear in the row — the dialog is the fee story; a page crop would be mostly empty sections.
  - Old Import → Tradovate sync checklist — already the `tradovate-sync-fee-type-options` surface.
  - Reusing `connections-hub` — that scene opens **Add connection**, not a Tradovate fee dialog.

## tradovate-sync-csv-same-fill

- Decision: 0 visuals
- Rationale: The claim is that a second row is *not* created. Local seed has no Tradovate sync+CSV pair. A mocked “one row” table would not prove cross-source identity.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Calendar day with a single P&L — could be any account; would not show sync vs CSV.
  - Before/after duplicate — would require staging a bug that this release removes.

## deleted-trades-stay-gone

- Decision: 0 visuals
- Rationale: The claim is that a deleted row stays gone after a later sync. A still of an empty table, or a video of “still gone,” is decorative.
- Primary/card asset: none
- Additional assets: none
- Omitted candidates:
  - Trade table after delete — does not show the cache expiry.
  - Sync toast — implementation, not the journal outcome.
