# Changelog outline: pr-488

Promotion PR: #488 (`main` ← `cursor/release-beta-to-main-changelog-879a`).

## Release window and evidence

- File-level window: `git diff origin/main...origin/beta` — 114 files, unique product work after #475.
- Commit log `origin/main..origin/beta` still lists 72 commits because the previous promotion squash-merged dashboard v5; those commits are **Covered** by published `pr-475` entries and must not be rewritten.
- Last production promotion on main: #475 dashboard v5 changelog (`dashboard-v5-shell`, `settings-v2-account-page`, `dxfeed-login-detects-prop-firm`, `csv-ai-chunked-parse`, `en-trading-journal-positioning`, `landing-ios-safari-canvas-chrome`, `mindset-journal-editor-stability` — all immutable). Main also has #476 Privacy controls on Settings v2.
- Unique user-facing work on beta not in main: #468 connection-account actions, #478 compare hub, #482 public 404 / agent discovery, #483 Protocol live balances, #484 DeepCharts CSV import.
- Unique non-changelog work: #410 session identity, #479 marketing-email-chrome skill, #480 signup analytics, leftover journal strings (#486), billing/equity/filter nits.

Published entries checked and left untouched include: `dashboard-v5-shell`, `settings-v2-account-page`, `dxfeed-login-detects-prop-firm`, `csv-ai-chunked-parse`, `en-trading-journal-positioning`, `landing-ios-safari-canvas-chrome`, `mindset-journal-editor-stability`, `weekly-trading-recap-email`, `rithmic-live-balance-display`, `rithmic-protocol-primary-connection`, `rithmic-protocol-server-sync`, `connections-hub-and-streamlined-imports`, `import-platform-picker-search`, `ai-csv-field-mapping`, `landing-page-redesign`, `faster-landing-page`, `privacy` Settings v2 (#476 on main).

Every proposed slug below is new under `content/updates/`.

## Coverage

- Included: Marketing compare hub + live 1:1s for Trademetria, TradeZella, Tradervue (`76ede5d2` #478) → `futures-journal-compare-hub`
- Included: DeepCharts Trade List CSV import (`ea955d19` #484) → `deepcharts-csv-import`
- Included: Mask, rename, and standalone delete on connection-strip account rows (`7529d622` #468) → `connection-account-mask-rename-delete`
- Included: Live **Rithmic balance** / **Solde Rithmic** for Rithmic Protocol accounts via the PnL plant (`006b0fd4` #483) → `rithmic-protocol-live-balances`
- Included: Unmatched URLs return a real HTTP 404 with agent pointers; `/llms.txt`; landing copy in prerendered HTML (`a8046eae` #482) → `public-404-and-llms-txt`
- Covered: leftover footer/pricing “trading journal” strings (`50379dc2` #486) → `en-trading-journal-positioning` (H1/lede unchanged; too small for a follow-up)
- Covered: Dashboard v5/v6 chrome, Settings v2, DxFeed login detection, CSV-with-AI chunks, EN hero, iOS Safari chrome, Mindset editor (`dc9e7be2`…`a30a0051` and related) → already published under `pr-475` slugs
- Skipped: Derive identity from Supabase session (`784a5747` #410) — no visible product change; do not describe the previous header-trust path
- Skipped: `user_signed_up` once on public User create (`8f3f1eba` #480) — analytics instrumentation
- Skipped: marketing-email-chrome agent skill (`8242876b` #479) — internal agent tooling
- Skipped: billing invoice currency/cadence/action copy (`b20e3bd5`) — correctness of existing Billing history rows
- Skipped: equity combined footer labeled as all accounts (`e359c120`) — one-label fix
- Skipped: navbar date chip **All dates** when no range (`a0ddba45`) — chip/filter honesty inside `dashboard-v5-shell`; too small for a follow-up
- Skipped: `Merge main into beta` — integration
- Skipped: tests, OpenAPI/OAuth scope plumbing as its own story (folded into `public-404-and-llms-txt` only where a visitor or agent can observe it), vitest config, proto files as implementation of #483

## Entry: futures-journal-compare-hub

- User outcome: Visitors can compare Deltalytix to Trademetria, TradeZella, and Tradervue from a futures-journal hub. Each competitor has a live 1:1 page. Footer **Journals comparison** links the hub and the three matchups. `/[locale]/trading-journal` permanently redirects to `/[locale]/trading-journal/futures`.
- Audience: Prospective visitors choosing a journal (EN and FR). Not a dashboard change.
- Surfaces:
  - Hub: `/en/trading-journal/futures`, `/fr/trading-journal/futures`
  - 1:1s: `/en|fr/trading-journal/futures/{trademetria,tradezella,tradervue}`
  - Footer: **Journals comparison** / **Comparaison des journaux** — **All journals** / **Tous les journaux**, **vs Trademetria**, **vs TradeZella**, **vs Tradervue**
  - Hub labels EN / FR: eyebrow **Trading journal · Futures** / **Journal de trading · Futures**; H1 **One trading journal for every futures account.** / **Un journal de trading pour tous vos comptes futures.**; table heading **Journals comparison** / **Comparaison des journaux**; Deltalytix chip **Us** / **Nous** and **You’re here** / **Vous êtes ici**; competitor action **View more →** / **Voir plus →**; closing **Start free, forever.** / **Commencez gratuitement, pour de bon.**; CTAs **Get Started** / **Commencer**, **See pricing** / **Voir les tarifs**
  - 1:1 title pattern: **Deltalytix vs {name}.** Breadcrumb **Trading journal** / **Journal de trading** → **Futures**
- Dates: 2026-08-26 → 2026-08-26
- Grouping rationale: One marketing surface. Hub + three 1:1s + footer links are how the same comparison is discovered. Do not split one entry per competitor. Do not fold leftover homepage footer description (#486) into this — that is covered positioning polish.
- Important details:
  - FR MDX exists (`content/compare/fr/{trademetria,tradezella,tradervue}.mdx`) and the hub is locale-aware via `getCompareCopy`. Do not claim “EN only” even though an earlier PR note said that; the shipped tree is bilingual.
  - Hub rows are live journals only. No Soon/Later chips. Deltalytix stays first as **Us** / **You’re here**, not a **View more** target.
  - Comparison copy is locked and must not invent competitor features, prices, DxFeed/futures SKUs, or Tradervue free-plan trade caps beyond what the MDX already states.
  - Parent `/trading-journal` is a redirect, not a separate landing.
  - Follow-up to `en-trading-journal-positioning` without rewriting it; the hub H1 reuses the same journal line.
- Try it: Open [the futures journal comparison](/en/trading-journal/futures), then **View more →** on TradeZella or Tradervue. Footer **Journals comparison** on [the homepage](/en) reaches the same hub.

### Story options

- A public hub for comparing Deltalytix to other futures journals, with live 1:1 pages.
- Concise: footer **Journals comparison** → hub table → **View more** 1:1s for Trademetria, TradeZella, Tradervue.

### Visual moments

- Hub first viewport: eyebrow, H1, lede, **Get Started** / **See pricing**, then the journals table with Deltalytix **Us** / **You’re here** and **View more →** on the three competitors.
- One 1:1 page (TradeZella or Trademetria): **Deltalytix vs {name}.** hero plus a **WHAT YOU GET** / **Us** vs **Them** section.
- Footer **Journals comparison** column on the public homepage.

### Visual caveats

- Capture EN and FR independently; FR copy is not a mechanical translation of the hub chrome.
- Do not photograph Soon/Later states — they are gone.
- Do not invent a fourth competitor row.

## Entry: deepcharts-csv-import

- User outcome: Traders can import closed trades from a DeepCharts Strategy Report → Trade List CSV. The platform appears in **Platform CSV Import** as **DeepCharts** / **DeepCharts Trade List CSV**. Header mapping is skipped (fixed columns); an account must still be chosen. Semicolon-delimited files are forced for this platform.
- Audience: Traders who export from DeepCharts. Available wherever file import is (Connections / import dialog). No plan flag.
- Surfaces:
  - Connections → **Upload a file** / import picker → **DeepCharts**
  - Labels: **DeepCharts**, **DeepCharts Trade List CSV** / **CSV Trade List DeepCharts**; details **Export closed trades from DeepCharts Strategy Report → Trade List as a semicolon-delimited CSV.** / **Exportez les trades clôturés depuis DeepCharts Strategy Report → Trade List au format CSV délimité par des points-virgules.**
  - Errors: **Unable to read this DeepCharts export** / **Impossible de lire cet export DeepCharts**; **Upload a DeepCharts Trade List CSV with Symbol, Quantity, Entry DT, Entry Price, Exit DT, and Exit Price columns.**; **No completed DeepCharts trades found** / **Aucun trade DeepCharts clôturé trouvé**
- Dates: 2026-08-26 → 2026-08-26
- Grouping rationale: One new import format. Do not combine with `csv-ai-chunked-parse` or `import-platform-picker-search`.
- Important details:
  - Required headers (order may vary): `Symbol`, `Quantity`, `Entry DT`, `Entry Price`, `Exit DT`, `Exit Price`. Optional `ProfitLoss` is used as cash P&L when present — never invented from ticks.
  - Quantity sign is side: positive long, negative short; stored quantity is absolute.
  - Naive timestamps like `2026-01-06 17:35:22` are stored as written (UTC wall-clock, no exchange TZ).
  - Commission is `0` when the file has no fee column. Blank rows are skipped.
  - Sample file: `public/samples/import/deepcharts-sample.csv`.
  - Do not claim live DeepCharts sync — CSV import only.
- Try it: From [Connections](/en/dashboard/connections), choose **Upload a file**, pick **DeepCharts**, and import a Trade List CSV (or the in-app sample).

### Story options

- Import closed DeepCharts trades from a Trade List CSV.
- Concise: DeepCharts joins Platform CSV Import; semicolon file, fixed columns, pick an account.

### Visual moments

- Import picker showing **DeepCharts** under **Platform CSV Import** with the monochrome mark.
- Optional: upload step or review of imported trades from the sample CSV — only if the flow can complete honestly on seeded local data.

### Visual caveats

- Local bypass can import the sample file into a standalone account; do not fake a DeepCharts live connection.
- Do not show CSV with AI as if it were this platform.

## Entry: connection-account-mask-rename-delete

- User outcome: Opening a connections-strip chip (or **Standalone**) now shows per-account actions: **Mask** / **Unmask** (eye) moves the account into **Hidden Accounts**; the display **name** sits above the account number and can be renamed inline; **Delete** is offered only for standalone accounts and permanently removes that account and its trades after confirm.
- Audience: Every dashboard user with accounts on the connections strip. Especially useful for hiding unused funded accounts and cleaning up file-imported standalone accounts.
- Surfaces:
  - Dashboard connections strip chip picker / drawer (`/{locale}/dashboard`)
  - Labels EN / FR: **Mask** / **Masquer**, **Unmask** / **Afficher**, **Rename** / **Renommer**, **Save name** / **Enregistrer le nom**, **Delete {account}** / **Supprimer {account}**, confirm **Delete this account?** / **Supprimer ce compte ?**, **This permanently deletes {account} and its trades.** / **Cela supprime définitivement {account} et ses trades.**, **Delete account** / **Supprimer le compte**
  - Hidden group name remains **Hidden Accounts** / **Comptes Masqués**
- Dates: 2026-08-20 → 2026-08-20
- Grouping rationale: One strip-row interaction model. Mask, rename, and standalone-only delete are discovered together. Do not re-announce the strip itself (`dashboard-v5-shell`) or the Connections hub (`connections-hub-and-streamlined-imports`).
- Important details:
  - Masked rows are visually muted; only the eye control stays primary.
  - Synced/connected accounts (e.g. Tradovate, Rithmic, DxFeed) can be masked, not deleted from this row. Delete is standalone-only.
  - Confirm dialog lives on the strip (not inside the closing popover) so delete can finish after the picker closes.
  - Failed mask/rename rolls back local state; do not claim infallible offline behavior.
  - Seeded local account `LOCAL-SIM-001` is standalone and can demonstrate delete-confirm **Cancel** only — never confirm deletion in capture.
- Try it: On [the dashboard](/en/dashboard), open a connections-strip chip, mask an account, rename a named account, and (for standalone only) open **Delete account** then cancel.

### Story options

- Connection-strip accounts can be masked, renamed, and — if standalone — deleted.
- Lead with hide/mask, then name-above-number + standalone delete.

### Visual moments

- Standalone (or a connection) picker open: name above number, eye control, muted masked row if one is masked, trash only on standalone.
- Delete confirm dialog after the picker has closed (**Cancel** state only).

### Visual caveats

- Never confirm delete. Seeded `LOCAL-SIM-001` is the honest standalone target for the confirm dialog.
- Do not show delete on a Tradovate/Rithmic/DxFeed row — those rows have no delete.
- Capture both a masked and an unmasked row if the picker can show them together without extra setup; otherwise one honest picker state is enough.

## Entry: rithmic-protocol-live-balances

- User outcome: Accounts linked to a **Rithmic Protocol** connection now show the same **Rithmic balance** / **Solde Rithmic** column and refresh control that classic Rithmic already had. Live values come from the Protocol PnL plant. The column and leftover values disappear when no classic or Protocol source remains.
- Audience: Traders on Rithmic Protocol (and classic Rithmic users who already had the column — they should see Protocol rows populated too). Not visible for non-Rithmic accounts.
- Surfaces:
  - Dashboard **Accounts** table and account cards: **Rithmic balance** / **Solde Rithmic**, loading **Fetching Rithmic balance…** / **Récupération du solde Rithmic…**, refresh control next to the column
  - Protocol errors can appear next to refresh without blocking classic balances
- Dates: 2026-08-26 → 2026-08-26
- Grouping rationale: Follow-up to `rithmic-live-balance-display` (classic path) now that Protocol is the primary connection (`rithmic-protocol-primary-connection`). Do not edit those entries. Throttle/cache internals are not a separate story.
- Important details:
  - Column still hidden for accounts with no Rithmic or Protocol link (seeded `LOCAL-SIM-001` correctly has no Solde column).
  - Protocol fetch is throttled (in-flight de-dupe, 15s floor on forced refresh, 30s sweep). Users without a Protocol connection never open a Protocol WebSocket.
  - Case-insensitive account matching. One account failing does not drop balances already collected.
  - Requires a configured Protocol endpoint and live credentials to see real numbers. Local bypass cannot honestly show a live Protocol balance.
  - Do not re-explain Protocol setup; link in spirit to the existing Protocol entries.
- Try it: With a Rithmic Protocol connection, open [the dashboard](/en/dashboard), switch to **Accounts**, and use refresh on **Rithmic balance**. Without Protocol or classic Rithmic, the column stays hidden.

### Story options

- Protocol-connected accounts now get live Rithmic balances in Accounts.
- Concise follow-up: the existing Solde column works for Rithmic Protocol, and clears after disconnect.

### Visual moments

- Accounts table with **Rithmic balance** populated on a Protocol-linked row — **only if** capture can do that honestly (live credentials or an existing capture-only mock under `scripts/changelog-media/`).
- None is valid and preferred when local seed has no Protocol connection — a screenshot of the column’s absence would not prove the claim.

### Visual caveats

- Do not mock live balances in product code. Do not reuse the old classic-only screenshot as if it showed Protocol.
- Seeded local dashboard will not demonstrate this; prefer **zero visuals** over a misleading empty Accounts table.

## Entry: public-404-and-llms-txt

- User outcome: Unknown public URLs now return a real HTTP 404 (previously a 200 app shell). The 404 page adds a **For AI agents and crawlers** section with links to the sitemap, `/llms.txt`, and API docs. The homepage’s features/pricing/FAQ copy is present in the prerendered HTML without waiting on JavaScript. `/llms.txt` is a plain-text index for agents.
- Audience: Visitors who hit a bad URL; AI agents and crawlers; anyone loading the public homepage with JS blocked. Not a dashboard change.
- Surfaces:
  - Any unmatched path (e.g. `/en/this-page-does-not-exist`) — existing 404 illustration/UI plus new **For AI agents and crawlers** block, **Markdown version** disclosure
  - `/llms.txt`
  - Public homepage HTML source (not a visual change when JS runs)
- Dates: 2026-08-24 → 2026-08-24
- Grouping rationale: One public-site readiness story (status code + agent entry points + SSR copy). Do not split robots.txt groups, OpenAPI scopes, or JSON `/api/*` errors into extra entries — those are implementation for the same agent-readiness pass and are not trader UI.
- Important details:
  - In-route `notFound()` still uses the existing 404 illustration; the visible addition is the agent-resources section on the global 404.
  - Do not claim a redesigned 404. Do not claim faster LCP/performance metrics (no measured numbers). Landing interactive previews still load client-side.
  - `/openapi.json` and robots groups are supporting, not the user-facing headline.
- Try it: Open a missing path such as `/en/this-page-does-not-exist` and read **For AI agents and crawlers**. Fetch [`/llms.txt`](/llms.txt).

### Story options

- Missing pages are real 404s, with a text index at `/llms.txt`.
- Concise: crawlers and agents get an honest miss plus pointers; homepage copy is in the HTML.

### Visual moments

- Global 404 page showing the existing not-found UI plus the **For AI agents and crawlers** list.
- None is also valid — the HTTP status and `/llms.txt` are clearer in text than a screenshot of a 404.

### Visual caveats

- Do not capture a dashboard 404 or an authenticated shell. Use a public unmatched URL.
- A screenshot cannot prove HTTP 404 vs 200; if captured, it only proves the new agent-resources copy exists.
