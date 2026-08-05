# Changelog media plan: pr-394

## ig-transaction-history-import

- Decision: 2 visuals
- Rationale: The entry makes two claims a reader would otherwise have to take on faith — that IG is now selectable, and that an IG export actually lands as usable trades. The picker proves location; the preview proves the result, including the skipped-row notice that the copy spends a bullet on. Neither substitutes for the other, and both are honest local product states rather than mockups.
- Primary/card asset: `ig-import-preview.png` — final import step showing three parsed trades, the skipped-row notice, and the totals. Chosen for the card because it shows the outcome rather than a menu.
- Additional assets:
  - `ig-import-picker.png` — Connections header with the **Upload a file** picker open and scrolled to IG, supporting the claim that IG is now among the supported platforms.
- Omitted candidates:
  - Activity History rejection state — the error message is quoted almost verbatim in the copy, so a screenshot of a red banner would add nothing beyond decoration.
  - Upload and account-selection steps — shared with every other file importer and not specific to IG.
  - Video of the whole flow — the two static states carry the story; the interaction in between is an ordinary three-step wizard.

## import-platform-picker-search

- Decision: 1 visual
- Rationale: "Filters as you type" is exactly the kind of claim one frame settles. A query with the list narrowed from thirteen platforms to two shows the search field, the typed query, and the result of filtering in a single tightly framed image. Keyboard navigation and the empty state stay in copy, since neither photographs meaningfully.
- Primary/card asset: `import-picker-search.png` — picker open with `rithmic` typed and the list reduced to the two Rithmic importers.
- Additional assets: none
- Omitted candidates:
  - Unfiltered picker — already used by the IG entry for a different claim; repeating it here would prove nothing about search.
  - Localized empty state — a panel reading "No import types found." is a one-line fact better left in the copy.

## Capture notes

- Fixture: `scripts/changelog-media/fixtures/ig-transaction-history-capture.csv`. The committed sample export at `public/samples/import/ig-transaction-history-sample.csv` holds a single trade and no skipped rows, so it cannot show the skipped-row notice. The capture fixture adds a second and third trade, one cash movement, and one fractional size. It is capture-only data and touches no product code.
- The IG capture stops at the preview step and never saves, so no trades are written to the local database.
- `openConnectionsForImport` reaches Connections by clicking the dashboard navbar link rather than loading the route directly. `ConnectionRow` (`connections-page-client.tsx:604`) formats sync timestamps as fr-FR on the server and en-US on the client, and server-rendering the route trips the Next.js dev hydration overlay in French, which `assertNoDevIssues` correctly rejects. The bug predates this batch and lives in code PR #394 does not touch, so the capture avoids the SSR path instead of altering product code.
