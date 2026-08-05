# Changelog outline: pr-394

## Release window and evidence

- Reviewed PR #394 (`beta` → `main`) at head `1ecc263`. The window contains a single user-facing implementation commit, `1ecc263` on 2026-08-04, which squash-merges PR #393.
- Diff reviewed directly: `app/[locale]/dashboard/components/import/config/platforms.tsx`, `app/[locale]/dashboard/components/import/ig/ig-processor.tsx`, `app/[locale]/dashboard/connections/components/connections-page-chrome.tsx`, `lib/ig-transaction-import.ts`, `lib/ig-transaction-import.test.ts`, `locales/{en,fr}.ts`, `public/logos/monochrome/ig-{black,white}.svg`, `public/samples/import/`.

## Coverage

- Included: IG Transaction History CSV import — new platform entry with account selection, the parser (UTC timestamps, signed size to side, accounting and European number formats, market-name conversion suffix stripping), skipped cash and fractional rows, Activity History rejection, sample export, and EN/FR copy (`1ecc263`, #393) → `ig-transaction-history-import`
- Included: searchable file-import platform picker on the Connections page, replacing the plain scrolling menu with a filterable command list and `aria-haspopup`/`aria-expanded` on both triggers (`1ecc263`, #393) → `import-platform-picker-search`
- Skipped: monochrome IG logo assets — supporting brand assets for the included import entry, not a separate capability.
- Skipped: parser unit tests and the anonymized sample CSV — supporting implementation and documentation for the included import entry.

## Entry: ig-transaction-history-import

- User outcome: IG traders can import their closed positions from an IG Transaction History CSV instead of having no IG path at all, with direction and time in position read from the export rather than inferred.
- Audience: Traders with an IG account.
- Surfaces: **Dashboard → Connections**, **Upload a file** picker, the IG upload / account / preview steps.
- Dates: 2026-08-04
- Grouping rationale: One import path shipped as a unit — the platform entry, the parser, the localized copy, and the preview notices are a single user-facing capability.
- Important details: Cash movements are skipped. Fractional sizes are skipped and counted rather than rounded, because `Trade.quantity` is an integer. Activity History exports are rejected with a specific message. Commission is not populated from the export.
- Try it: Connections → **Upload a file** → **IG**, with the linked sample CSV.

### Visual moments

- IG present in the import picker among the supported platforms.
- Preview step: parsed trades plus the skipped-row notice.

## Entry: import-platform-picker-search

- User outcome: The file-import picker filters as you type instead of requiring a scroll through every supported platform.
- Audience: Anyone starting a file import.
- Surfaces: **Dashboard → Connections** → **Upload a file**, and the same picker reopened from the selected-platform button.
- Dates: 2026-08-04
- Grouping rationale: A distinct interaction change on a shared control. It ships in the same commit as the IG import but is not specific to IG, so it reads as its own note.
- Important details: Matching covers platform name and description. Keyboard navigation and a localized empty state come from the command list. The picker is not mentioned in the PR description; it was identified from the diff.
- Try it: Connections → **Upload a file**, then type a platform name.

### Visual moments

- Picker with a query typed and the list narrowed to the matches.
