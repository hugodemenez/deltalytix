---
name: import-file-parse
description: >-
  Parse any trading export through Deltalytix Intelligent Import. An agent
  writes a parseChunk script when headers are not enough. Use when testing
  CSV with AI, adding parse-script contracts, or running chunks in a Vercel
  Sandbox. Column mapping is not part of this flow.
---

# Import file parse

Intelligent Import is web-only. The user drops a file. We peek headers + a few rows, write a parser, prove it on the sample, then stream the file in chunks. There is no column-mapping step.

## Pipeline

1. `peekDelimitedFile` reads the first 32KB only. The `File` stays a blob. Do not `readAsText` the whole file.
2. If `planFromHeaders` is complete, `executeParsePlanChunk` runs locally while Papa streams the `File`.
3. Otherwise `/api/ai/import-parse-script` writes `function parseChunk(rows, session)`. `/api/import/parse-chunk` runs it in a Vercel Sandbox when OIDC/token creds exist, or a sealed Node `vm` in local/dev. Repair up to 3 times if the sample yields no trades.
4. One sandbox per import (`sandboxName`), not one VM per chunk. Empty chunks are not success or failure.
5. Review shows the first 200 trades. Save still holds the full trade list (batch save is a follow-up).

Do not bring back batched `useObject` row formatting or a mapping table on this path.

## Script contract

See `PARSE_SCRIPT_CONTRACT` in [`lib/import/parse-script.ts`](../../../lib/import/parse-script.ts). The function must be named `parseChunk`, take `(rows, session)`, and return `{ trades, session, skipped }`. No `import` / `require` / `fetch`.

## How to verify

```ts
import { runInVm } from "@/lib/import/run-parse-script";

const { trades } = runInVm(script, sampleRows, {});
```

UI path: Connections → Upload a file → CSV with AI → account → Review Trades. Expect trades without Map Columns or Start Processing.

| Change | Where |
| --- | --- |
| New column name (common CSVs) | `HEADER_ALIASES` in `parse-plan.ts` |
| Agent prompt / contract | `parse-script.ts`, `app/api/ai/import-parse-script` |
| Sandbox vs vm | `run-parse-script.ts` |
