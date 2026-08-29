# Changelog media plan: pr-488

## futures-journal-compare-hub

- Decision: 2+ visuals
- Rationale: This is a new public surface. The claim is a comparison **table** (Deltalytix as **Us** / **You’re here**, three live **View more →** rows) plus real 1:1 pages — not the hub H1, which already shipped under `en-trading-journal-positioning`. One tightly framed table shot proves the hub; one TradeZella 1:1 shot proves a distinct second surface (breadcrumb + **Deltalytix vs TradeZella.** + **WHAT YOU GET** / **Ce que vous avez** with Us vs Them). A third footer shot would only repeat the same four destinations as links. EN and FR copy differ (eyebrow, chips, **Voir plus →**), so both locales are captured.
- Primary/card asset: `compare-hub-journals-table.png` — new scene `compare-hub-journals-table` (desktop 1440×900, `/{locale}/trading-journal/futures`). Scrolls to **Journals comparison** / **Comparaison des journaux** and clips that section: Deltalytix **Us** / **Nous** + **You’re here** / **Vous êtes ici**, then Trademetria, TradeZella, and Tradervue each with **View more →** / **Voir plus →**. No Soon/Later chips.
- Additional assets:
  - `compare-tradezella-what-you-get.png` — new scene `compare-tradezella-what-you-get` (desktop 1440×1400 so the huge title and first section share a frame, `/{locale}/trading-journal/futures/tradezella`). Breadcrumb **Trading journal** / **Journal de trading** → **Futures**, H1 **Deltalytix vs TradeZella.**, and section **01 WHAT YOU GET** / **01 Ce que vous avez** with Deltalytix vs TradeZella columns. Supports the “live 1:1 pages” claim, not a second photo of the hub table.
- Omitted candidates:
  - Hub first-viewport hero (eyebrow + H1 + **Get Started** / **See pricing**) — the H1 is the same journal line already published; a hero-only shot would not show the table that is this entry’s new evidence.
  - Footer **Journals comparison** column on `/en|fr` — discovery only; the same four links are already visible as table rows and the 1:1 URL. Decorative next to the hub table.
  - Trademetria or Tradervue 1:1 — same layout as TradeZella; a second matchup would repeat the Us vs Them pattern without a new claim.
  - Parent `/trading-journal` redirect — a 308 is not a screenshot.

## deepcharts-csv-import

- Decision: 1 visual
- Rationale: The user-facing change is that **DeepCharts** now exists under **Platform CSV Import**. One picker screenshot with the monochrome mark, the name, and **DeepCharts Trade List CSV** / **CSV Trade List DeepCharts** locates the platform. Header rules, semicolon delimiter, and error strings are already named in copy; a completed import would mostly restate other CSV-preview captures and is not required to prove “it is in the picker.”
- Primary/card asset: `deepcharts-import-picker.png` — new scene `connections-import-picker-deepcharts` (desktop, Connections via `openConnectionsForImport` → `openImportPicker`, type `deepcharts`). Clips heading + **Upload a file** / **Ajouter avec un fichier** + picker so the filtered **Platform CSV Import** / **Import CSV Plateforme** group shows DeepCharts. Search is the honest way to keep DeepCharts on-screen; it is not a recap of `import-platform-picker-search`.
- Additional assets: none.
- Omitted candidates:
  - Upload / account-select / processed-trades from `public/samples/import/deepcharts-sample.csv` — doable on `LOCAL-SIM-001`, but it shows a generic review table, not the new platform identity. Skipped so this entry stays one picker frame.
  - Unfiltered full picker scrolled to DeepCharts — Fragile (DeepCharts sits after FTMO) and would look like the existing IG picker shot with a different row highlighted.
  - CSV with AI selected as if it were DeepCharts — must not be captured.
  - A fake live DeepCharts connection — CSV import only.

## connection-account-mask-rename-delete

- Decision: 2+ visuals
- Rationale: Two distinct states. The picker on the dashboard **Standalone** / **Autonome** chip is where mask (eye), rename (pencil), and standalone-only delete (trash) live together, with the display name above the account number. The confirm dialog is a **different** surface: it mounts on the strip after the picker closes, which is the copy’s explicit delete story. One shot cannot show both. Video is unnecessary — both states are static. Seeded `LOCAL-SIM-001` is the honest standalone row; delete capture stops at **Cancel** / **Annuler**.
- Primary/card asset: `strip-standalone-account-actions.png` — new scene `dashboard-strip-standalone-actions` (desktop, `/{locale}/dashboard`, not the Connections page). Opens the connections-strip **Standalone** / **Autonome** chip; clips chip + popover with seeded **Local Simulation** above **LOCAL-SIM-001**, eye (**Mask** / **Masquer**), pencil, and trash. Does not click mask (would persist **Hidden Accounts** / **Comptes Masqués** into later captures). Trash aria-label is **Delete Local Simulation** / **Supprimer Local Simulation**.
- Additional assets:
  - `strip-standalone-delete-confirm.png` — new scene `dashboard-strip-standalone-delete-confirm` (same dashboard strip path). Clicks trash on `LOCAL-SIM-001` only, waits for **Delete this account?** / **Supprimer ce compte ?** and **This permanently deletes LOCAL-SIM-001 and its trades.** / **Cela supprime définitivement LOCAL-SIM-001 et ses trades.**, clips the dialog with **Cancel** / **Annuler** and **Delete account** / **Supprimer le compte** visible, then clicks **Cancel** only. Never clicks the destructive action.
- Omitted candidates:
  - Masked + unmasked rows in one picker — seed has a single standalone account; masking it would mutate demo data for the rest of the batch. One unmasked row is enough.
  - Rename inline-edit — a third shot of the same row with the pencil active; the name-above-number layout is already visible in the primary picker frame.
  - Synced Tradovate/Rithmic/DxFeed row without trash — true, but local seed has no synced connection; a screenshot of “no trash” would be an empty negative. Copy already states delete is standalone-only; the standalone row **with** trash is the positive evidence.
  - Connections hub account list — wrong surface; this entry is the dashboard strip.

## rithmic-protocol-live-balances

- Decision: 0 visuals
- Rationale: The claim is a **populated** **Rithmic balance** / **Solde Rithmic** column on a Protocol-linked row. Local seed (`LOCAL-SIM-001`) has no Protocol connection, so the column is correctly hidden. An empty Accounts table would not prove Protocol balances work and could be read as a regression. Capture-only mocks of live balances do not exist under `scripts/changelog-media/`. Product code must not be mocked. Zero visuals is the honest choice; copy already points at the classic-Rithmic and Protocol-primary entries.
- Primary/card asset: none.
- Additional assets: none.
- Omitted candidates:
  - `accounts-table-desktop` reused as if it showed Protocol — it would show the column’s absence, which is the non-Protocol default, not this follow-up.
  - Classic-only screenshot from `rithmic-live-balance-display` — must not be reused as Protocol evidence.
  - Injecting fake Protocol balances in product code — forbidden.

## public-404-and-llms-txt

- Decision: 1 visual
- Rationale: HTTP 404 vs 200 cannot appear in a PNG, and `/llms.txt` plus prerendered homepage HTML are source-level. The **visible** addition is the **For AI agents and crawlers** block (hardcoded English, including on FR) with sitemap / `/llms.txt` / API pointers and a collapsed **Markdown version** disclosure. One tight clip of that section on a public unmatched URL proves the new UI without pretending the status code is visible. The existing 404 illustration is unchanged and is left out of the frame.
- Primary/card asset: `public-404-agent-resources.png` — new scene `public-404-agent-resources` (desktop, `/{locale}/this-page-does-not-exist`, which must hit `app/global-not-found.tsx`, not in-route `app/not-found.tsx`). Scrolls `#agent-resources-heading` into view and clips `section[aria-labelledby="agent-resources-heading"]`. Agent copy is English in both locale folders; that matches the shipped UI.
- Additional assets: none.
- Omitted candidates:
  - Full-page 404 illustration + search — unchanged chrome; would bury the new block and still would not show HTTP status.
  - Dashboard or authenticated 404 — wrong surface.
  - Expanded **Markdown version** `<pre>` — extra text, same claim as the link list.
  - Screenshot of `/llms.txt` in the browser — a plain-text index; the changelog already links it. Not a product layout.
  - Zero visuals — valid for the status-code headline, but would leave the new agent-resources layout unproven; one tight clip is enough.
