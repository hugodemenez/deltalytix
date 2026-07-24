# Deltalytix Discord Support Bot — Design Doc

**Status:** Draft / proposal
**Branch:** `claude/discord-bot-chat-sdk-zst8f7`
**Author:** drafted with Claude Code
**Date:** 2026-07-24

---

## 1. Goal

Give Deltalytix a Discord bot that **answers user questions in a support channel
automatically**, grounded in the project's own documentation. When the docs
don't contain an answer, it says so honestly and escalates to the human team
instead of guessing.

Concretely:

- The bot **watches a support channel** (e.g. `#support`) and replies to user
  messages on its own — no slash command required.
- Answers are **grounded in the current documentation** using semantic search
  (embeddings + pgvector), so replies stay accurate as the docs evolve.
- Answers **cite their sources** (which doc/update they came from) and link back
  to the real pages.
- It is **bilingual (EN/FR)**, matching the existing docs.
- It **never invents** Deltalytix-specific behavior. Unknown → escalate, reusing
  the existing email-escalation pattern.

Non-goals for v1: anything that reads a user's private account/trade data. The
public bot is **documentation-only**. Account-aware answers are a later phase
that requires Discord↔account identity linking (already partially in place via
`components/linked-accounts.tsx`).

---

## 1.1 DB state — verified against `beta`

This doc was re-checked against `origin/beta` (branch rebased onto it). Findings:

- **Postgres confirmed** — `prisma/schema.prisma` still `provider = "postgresql"`
  (client `provider = "prisma-client"`). pgvector plan holds.
- **No existing vector/embedding infrastructure** — a grep across
  `prisma/schema.prisma` and all 89 migrations finds **no** `vector`,
  `embedding`, or `pgvector`. So the `DocChunk` + pgvector work in §4 is entirely
  net-new; nothing to reconcile with.
- **Recent DB-relevant migrations** (context, not blockers): Trade indexes on
  `(userId, entryDate)` (`20260720…`), `connection_account_trade_links`
  (`20260715…`), `synchronization_environment` (`20260531…`), and
  **`Connection.token` is now encrypted at rest**. That last one matters for the
  *future* account-aware phase (§13, Phase 4): reading a user's connection would
  go through the same decryption path — another reason to keep v1 docs-only.
- No `DocChunk` / support-log / feedback models exist yet — all introduced here.

## 2. Why this is a good fit for the existing codebase

The two hardest pieces already exist:

| Piece | Already in repo | Reused for the bot |
| --- | --- | --- |
| AI SDK stack | `ai@6`, `@ai-sdk/openai`, `streamText`, tool-calling, `app/api/ai/*` | Answer generation |
| Model gateway format | `openai/gpt-5-mini` string models (`app/api/ai/chat/route.ts`) | `openai/text-embedding-3-small` embeddings, same gateway |
| Postgres + Prisma | `prisma/schema.prisma` (`provider = "postgresql"`) | pgvector store lives in the same DB |
| Documentation corpus | `content/updates/{en,fr}/*.mdx` (~92 files), `README.md`, `public/AGENTS.md` | The knowledge base |
| Escalation pattern | `app/api/ai/support/tools/ask-for-email-form.ts` + the "never hallucinate, escalate" support prompt | Graceful "I don't know" fallback |
| Discord identity | `server/auth.ts → signInWithDiscord`, `components/linked-accounts.tsx` | Future account-aware answers |

What's **new**: (1) the Discord gateway connection, (2) an embedding/ingestion
pipeline for the docs, (3) a retrieval-augmented answer service.

---

## 3. Architecture

Discord's message-streaming (Gateway) API needs a **persistent WebSocket
connection**, which does **not** fit Vercel's serverless model. So the system
splits into three parts, two of which are already where they belong (the Next.js
app on Vercel):

```
                      ┌─────────────────────────────────────────────┐
                      │  Discord                                     │
                      │  #support channel                            │
                      └───────────────┬─────────────────────────────┘
                                      │ Gateway (WebSocket, MESSAGE_CREATE)
                                      ▼
          ┌───────────────────────────────────────────────┐
          │  (A) Gateway Worker  (always-on, NOT Vercel)   │
          │  - discord.js client, listens to #support      │
          │  - rate-limits per user, ignores bots/self     │
          │  - shows typing indicator                      │
          │  - POSTs the question to the Vercel answer API │
          └───────────────┬───────────────────────────────┘
                          │ HTTPS (signed request)
                          ▼
    ┌──────────────────────────────────────────────────────────────┐
    │  Next.js app on Vercel                                        │
    │                                                              │
    │  (B) Answer API + Workflow   /api/discord/answer             │
    │      - Vercel Workflow (durable, retryable)                  │
    │      - embed question → vector search → build context        │
    │      - streamText(grounded prompt, cite sources)             │
    │      - returns answer + citations to the worker             │
    │                                                              │
    │  (C) Ingestion pipeline   /api/discord/reindex (cron)       │
    │      - reads content/updates/**, README, AGENTS.md          │
    │      - chunk → embed → upsert into pgvector                  │
    └──────────────────────────┬───────────────────────────────────┘
                               │ Prisma
                               ▼
                   ┌──────────────────────────┐
                   │  Postgres + pgvector     │
                   │  DocChunk(embedding)     │
                   └──────────────────────────┘
```

### Why this split

- **(A) Gateway Worker** is deliberately *thin*: it only owns the Discord
  connection and basic hygiene (rate-limit, dedupe, typing indicator). All AI
  logic stays in the Next.js app so it reuses the existing AI SDK setup and env.
  Hosting: a small always-on box (~128MB RAM is plenty). See §11.1 for the
  free/cheap hosting reality — **Railway is not truly free for a 24/7 worker**;
  a genuinely-free always-on option is Oracle Cloud "Always Free" or folding the
  worker into existing infra.
- **(B) Answer API** runs on Vercel and wraps the RAG call in a **Vercel
  Workflow** so a slow/failed LLM or embedding call is durably retried rather
  than dropping the user's question. This is where "Vercel Workflows" earns its
  place in the stack.
- **(C) Ingestion** is a scheduled job (add to the existing `vercel.json` crons)
  plus an on-demand endpoint you can hit after merging doc changes.

> **Alternative considered — slash command only (`/ask`):** fully serverless, no
> worker, but requires the user to invoke it explicitly and doesn't monitor the
> channel. Rejected per the requirement to *watch a support channel*. The
> answer API (B) and ingestion (C) are identical either way, so a `/ask` command
> can be added later as a thin second entry point with near-zero extra work.

---

## 4. Data model (pgvector)

Add the `vector` extension and a chunk table. Because the Prisma client is
generated (`prisma/schema.prisma`, `provider = "prisma-client"`), the vector
column is added via raw SQL migration and queried with `$queryRaw`.

### Migration (SQL)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "DocChunk" (
  id           TEXT PRIMARY KEY,
  source       TEXT NOT NULL,           -- e.g. "content/updates/en/ai-csv-field-mapping.mdx"
  locale       TEXT NOT NULL,           -- "en" | "fr"
  title        TEXT,                    -- nearest heading / frontmatter title
  url          TEXT,                    -- public URL to cite, if any
  heading_path TEXT,                    -- "AI Import > CSV Field Mapping"
  content      TEXT NOT NULL,           -- the chunk text
  content_hash TEXT NOT NULL,           -- to skip re-embedding unchanged chunks
  embedding    vector(1536) NOT NULL,   -- text-embedding-3-small = 1536 dims
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approximate nearest-neighbour index (cosine distance)
CREATE INDEX doc_chunk_embedding_idx
  ON "DocChunk" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX doc_chunk_locale_idx ON "DocChunk" (locale);
CREATE UNIQUE INDEX doc_chunk_source_hash_idx ON "DocChunk" (source, content_hash);
```

Optional companion tables (v2): `SupportQuestion` (logs every question + which
chunks were retrieved + the answer) and `SupportFeedback` (👍/👎), both useful
for finding documentation gaps.

---

## 5. Ingestion pipeline (C)

Turns the MDX/Markdown corpus into embedded, searchable chunks.

1. **Discover** — glob `content/updates/**/*.mdx`, `README.md`,
   `public/AGENTS.md`, `SECURITY.md`, and the embed/support READMEs.
2. **Parse** — strip MDX/JSX and frontmatter to plain text; keep the heading
   trail (`heading_path`) and derive `locale` from the path (`/en/` vs `/fr/`).
3. **Chunk** — split on headings, then ~800–1000 token windows with ~100 token
   overlap. Small corpus (~96 files) → low hundreds of chunks total.
4. **Hash & diff** — compute `content_hash` per chunk; skip chunks whose hash
   already exists (avoids re-embedding unchanged docs and keeps cost near zero).
5. **Embed** — `embedMany({ model: 'openai/text-embedding-3-small', values })`
   from the AI SDK, batching.
6. **Upsert** — write via `$executeRaw` into `DocChunk`; delete chunks whose
   source no longer produces them (handles deleted/renamed docs).

**Triggering:**

- **Cron** — add to `vercel.json` (daily is plenty; docs change on deploy):
  ```json
  { "path": "/api/discord/reindex", "schedule": "0 6 * * *" }
  ```
- **On-demand** — `POST /api/discord/reindex` (protected by `CRON_SECRET`)
  after merging documentation changes.
- **Optional** — wrap the reindex in a **Vercel Workflow** so a partial failure
  (e.g. embedding rate limit) resumes instead of restarting the whole batch.

---

## 6. Retrieval + answer service (B)

Endpoint: `POST /api/discord/answer` — called by the worker, wrapped in a Vercel
Workflow.

1. **Auth** — verify a shared secret / signed header from the worker
   (`DISCORD_WORKER_SECRET`). Reject anything else.
2. **Detect locale** — from the Discord message locale or lightweight language
   detection; default to matching the channel.
3. **Embed the question** — `embed({ model: 'openai/text-embedding-3-small' })`.
4. **Vector search** — top-k (k≈6) by cosine distance, filtered by `locale`
   (fall back to EN if a FR chunk set is thin):
   ```ts
   const rows = await prisma.$queryRaw`
     SELECT id, source, title, url, heading_path, content,
            1 - (embedding <=> ${embeddingLiteral}::vector) AS score
     FROM "DocChunk"
     WHERE locale = ${locale}
     ORDER BY embedding <=> ${embeddingLiteral}::vector
     LIMIT 6;`;
   ```
5. **Relevance gate** — if the best score is below a threshold, skip generation
   and return the escalation path instead of a low-confidence answer.
6. **Generate** — `streamText` with `openai/gpt-5-mini` (matches the existing
   chat route), a grounded system prompt, and the retrieved chunks as context.
7. **Return** — answer text + the list of cited sources (title + URL) so the
   worker can render clean Discord message + link footer.

### Grounding prompt (sketch)

Reuse the discipline already encoded in `app/api/ai/support/route.ts` — the
existing support prompt is explicitly anti-hallucination — but flip it from
"no documentation access" to "answer **only** from the provided documentation":

```
You are the Deltalytix support assistant in Discord.
Answer ONLY using the DOCUMENTATION CONTEXT below.
- If the answer is not in the context, say you don't have that in the docs and
  offer to escalate to the team. Do NOT guess or invent features.
- Cite the sources you used by title.
- Reply in {locale}. Keep it concise and Discord-friendly (short paragraphs).

DOCUMENTATION CONTEXT:
{retrieved chunks with source titles}
```

When the relevance gate trips or the model declines, the worker posts a short
"I couldn't find this in the docs — want me to open a support ticket?" message,
reusing the existing `askForEmailForm` escalation flow.

---

## 7. Gateway worker (A)

A small standalone Node service (lives in `discord-bot/` in this repo, deployed
separately). Uses `discord.js` with the `Guilds`, `GuildMessages`, and
`MessageContent` intents.

Responsibilities:

- Connect to the Gateway and listen for `MessageCreate` in the configured
  channel(s) only.
- Ignore messages from bots (including itself) and empty/command messages.
- **Rate-limit per user** (e.g. token bucket, N questions / minute) — a public
  bot means public LLM spend; this is mandatory.
- Show a **typing indicator** while the answer API runs.
- POST `{ question, userId, locale, channelId }` to `/api/discord/answer` with
  the signed secret.
- Post the answer as a reply, optionally in a **thread** to keep the channel
  clean, with a sources footer and 👍/👎 reaction buttons (feedback → v2 table).
- Handle failures gracefully (timeout → "still thinking" / fallback message).

The worker holds **no AI logic and no DB access** — it's a transport shim. That
keeps secrets (OpenAI/gateway keys, DB URL) on Vercel, not on the worker box.

---

## 8. Files to add

```
docs/discord-support-bot.md                     ← this document

# Next.js app (Vercel) — reuses existing AI SDK setup
app/api/discord/answer/route.ts                 ← retrieval + streamText (B)
app/api/discord/reindex/route.ts                ← ingestion trigger (C)
lib/discord/ingest.ts                           ← discover/parse/chunk/embed/upsert
lib/discord/retrieve.ts                          ← embed question + vector search
lib/discord/prompt.ts                            ← grounded system prompt (EN/FR)
prisma/migrations/<ts>_docchunk_pgvector/migration.sql

# Standalone worker (deployed to Railway/Fly/Render) — always-on
discord-bot/package.json
discord-bot/src/index.ts                         ← discord.js gateway client (A)
discord-bot/src/rate-limit.ts
discord-bot/README.md                            ← deploy + env instructions
```

Package manager is **bun** (`bun.lock`), so worker scripts and any new deps
follow the existing `bun` conventions.

---

## 9. Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | Worker | Bot token (new Discord Application) |
| `DISCORD_SUPPORT_CHANNEL_IDS` | Worker | Comma-separated channel allowlist |
| `DELTALYTIX_ANSWER_URL` | Worker | URL of `/api/discord/answer` |
| `DISCORD_WORKER_SECRET` | Worker + Vercel | Shared secret signing worker→API calls |
| `OPENAI_API_KEY` / gateway creds | Vercel | Embeddings + generation (already present) |
| `DATABASE_URL` | Vercel | Postgres w/ pgvector (already present) |
| `CRON_SECRET` | Vercel | Protects `/api/discord/reindex` (pattern already used by existing crons) |

Note: existing `DISCORD_ID` / `DISCORD_SECRET` are for **OAuth login** and are
unrelated to the bot token — the bot needs its own Application + token.

---

## 10. Discord application setup (one-time)

1. Create a new application in the Discord Developer Portal → add a **Bot**.
2. Enable the **Message Content Intent** (required to read channel messages).
3. Invite the bot to the server with `Read Messages`, `Send Messages`,
   `Create Public Threads`, `Add Reactions` scopes.
4. Put the bot token in the worker's env; restrict it to the support channel(s).

---

## 11. Cost & performance

- **Corpus is tiny** (~96 files → low hundreds of chunks). Full re-embed costs
  fractions of a cent with `text-embedding-3-small`; incremental (hash-diff)
  re-index is effectively free.
- **Per question**: 1 embedding call + 1 `gpt-5-mini` completion. Sub-second
  retrieval from pgvector (HNSW) at this scale.
- **Latency budget**: Gateway has no 3-second reply constraint (unlike slash
  commands), so the typing indicator + Workflow retrying a slow call is fine.

### 11.1 Worker hosting cost — can it run free on Railway?

**Not reliably.** Railway removed its old free tier. As of mid-2026:

- **Trial** — one-time $5 credit, 30 days. Fine for a demo, not ongoing.
- **Free plan** — ~$1/month in non-rollover credits. A *minimal* always-on
  service (0.5 vCPU / 0.5GB) costs ~$0.80–1.00/month, so it *technically* fits
  the $1 — but only with **zero attached database** and no headroom; any spike
  blows the cap. Not something to rely on for a support bot users depend on.
- **Hobby** — $5/month minimum (includes $5 of usage). This is the realistic
  Railway number for a dependable 24/7 worker.

Our worker is deliberately thin (no DB, no AI calls — those live on Vercel), so
it *could* squeak into Railway's free/Trial window, but it will eventually need
Hobby (~$5/mo). Genuinely-free always-on alternatives for a tiny Node worker:

| Option | Free? | Notes |
| --- | --- | --- |
| **Oracle Cloud "Always Free"** | Yes, truly | ARM Ampere micro VM, always-on, no time limit. Best free fit for a persistent Gateway worker. Requires a card for verification. |
| **Fold into existing infra** | Yes | If Deltalytix already runs a small always-on box/VM, add the worker there. |
| **Fly.io** | Pay-as-you-go | Small monthly usage; a single tiny machine is often cents, but no guaranteed $0. |
| **Render** | No (for this) | Free tier only covers web services that *sleep* — a Gateway WebSocket can't sleep, so it needs a paid background worker. |
| **Railway** | Trial/marginal | ~$1/mo free plan is tight; Hobby $5/mo for reliability. |

**Recommendation:** Oracle Cloud Always Free for a real $0, or fold into existing
infra. Treat Railway as the convenient ~$5/mo option, not a free one. (The Vercel
side — answer API, ingestion, pgvector in the existing Postgres — adds no new
hosting cost; it rides your current deployment.)

---

## 12. Security & abuse

- Documentation-only in v1 → no private data exposed even if prompt-injected.
- Per-user rate limiting in the worker; consider a per-channel daily cap.
- Signed worker→API requests; API rejects unsigned calls.
- Treat message text as untrusted; the grounded prompt + relevance gate limit
  prompt-injection blast radius (worst case: refusal/escalation).

---

## 13. Phased rollout

| Phase | Scope |
| --- | --- |
| **0 — Ingestion** | pgvector migration + `ingest.ts` + `/api/discord/reindex`. Verify chunks land and vector search returns sane results. No Discord yet. |
| **1 — Answer API** | `/api/discord/answer` with retrieval + grounded generation + citations + relevance gate. Test via curl. |
| **2 — Worker** | `discord-bot/` gateway client watching `#support`, rate limiting, typing, threaded replies. |
| **3 — Escalation + feedback** | Wire `askForEmailForm`-style escalation; add 👍/👎 → `SupportFeedback`; log questions to find doc gaps. |
| **4 (later) — Account-aware** | Link Discord identity → answer account-specific questions with strict auth. Out of scope for the public bot. |

---

## 14. Open questions

1. **Worker hosting** — Railway / Fly.io / Render / existing infra? Affects the
   deploy section of `discord-bot/README.md`.
2. **Reply style** — reply inline in `#support`, or spin a thread per question?
   (Thread is cleaner; inline is more visible.)
3. **Answer surface** — also expose the same RAG as a `/ask` slash command and
   in the existing in-app support widget? The API (B) already supports it.
4. **Doc URLs** — do `content/updates/*` entries have stable public URLs to cite?
   If yes, we link; if not, we cite by title only for now.
5. **Relevance threshold** — tune on real questions after Phase 1.

---

## 15. Feasibility verdict

**Yes, and most of the risk is already retired.** The AI SDK, Postgres, Prisma,
the documentation corpus, and the anti-hallucination support pattern all exist.
The genuinely new work is (a) a thin always-on Discord worker — the only piece
that can't live on Vercel — and (b) an embeddings/ingestion pipeline over the
existing docs. Vercel Workflows add durability to the answer/ingestion calls
rather than being load-bearing infrastructure.
