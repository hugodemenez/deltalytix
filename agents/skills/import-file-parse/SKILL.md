---
name: import-file-parse
description: >-
  Parse any trading CSV (closed trades or order fills) through Deltalytix
  Intelligent Import. Use when testing CSV with AI, reproducing import bugs,
  adding header aliases, or deciding whether a file needs AI. Do not embed
  Vercel Eve in this flow.
---

# Import file parse

Intelligent Import turns a spreadsheet into `Trade` rows with a **parse plan**, not a row-by-row LLM rewrite.

Eve is the right *idea* (inspect the file, write a script, run it, repair the script). It is the wrong *runtime* here: this is an existing Next.js dialog that must work on self-host/VPS without Vercel Sandbox, Workflows, or AI Gateway. Keep the plan interpreter in-process.

## Pipeline

1. `planFromHeaders` / `planFromMappings` in [`lib/import/parse-plan.ts`](../../../lib/import/parse-plan.ts) build a JSON plan (column indexes + `closed-trades` vs `orders`).
2. `executeParsePlanChunk` runs that plan in slices of `PARSE_PLAN_CHUNK_SIZE` (2500 rows). Closed-trade rows are independent. Order fills keep open lots on a `ParsePlanSession` so a buy in chunk 1 can close in a later chunk. An empty chunk is not success or failure.
3. `/api/ai/import-parse-plan` is only for files the heuristic cannot map. It sees at most 8 sample rows. A dummy or missing `OPENAI_API_KEY` must 503 with `AI_UNAVAILABLE`.
4. Review Trades (`FormatPreview`) walks chunks and yields to the main thread. The table shows the first `PARSE_PREVIEW_LIMIT` (200) trades. The full list is stored only after parsing finishes, for Save. Do not bring back batched `useObject` formatting, and do not call `executeParsePlan` on the whole file in the UI.

## How to verify a file

```ts
import {
  createParsePlanSession,
  executeParsePlanChunk,
  planFromHeaders,
} from "@/lib/import/parse-plan";

const plan = planFromHeaders(headers);
const session = createParsePlanSession();
const { trades } = executeParsePlanChunk(rows.slice(0, 2500), plan, session);
```

Add a unit test in `lib/import/parse-plan.test.ts` for a new layout before changing UI.

UI path: Connections → Upload a file → CSV with AI → map columns (pre-filled) → account → Review Trades. Expect trades in the table without Start Processing. Save stays disabled until at least one trade has `entryDate`.

## When to extend what

| Change | Where |
| --- | --- |
| New column name | `HEADER_ALIASES` in `parse-plan.ts` |
| New date/number quirk | `parseDateToIso` / `parseNumber` |
| New fill-pairing rule | `pairOrderFills` |
| Weird files that still need a model | `app/api/ai/import-parse-plan` prompt/schema |

Do not add `eve`, `agent/`, or a sandbox eval of model-generated JavaScript to this import path.
