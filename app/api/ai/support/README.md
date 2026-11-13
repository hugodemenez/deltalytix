# Deltalytix Support Assistant

The support assistant answers product questions from an in-memory clone of the
repository and, crucially, never leaves a user stuck: a human hand-off is always
one click away.

## Two escape hatches, always available

The UI (`app/[locale]/(landing)/support/page.tsx`) owns escalation, not the model:

- A **Request Human Support** button in the header, plus a **Talk to a human** starter chip, open the contact form directly — no model round-trip.
- After the user's first message, an inline **human hand-off** prompt appears under the conversation so a stuck user is never more than one click from a person.
- The model can _also_ escalate by calling `askForEmailForm`; when it does, the UI opens the same contact form pre-filled with the model's summary.

This is deliberate: routing "I want a human" through the model is exactly the loop we removed.

## Knowledge: repo clone + grep

The agent reads the real codebase through `lib/ai/search-codebase.ts`, backed by an
in-memory index in `lib/ai/codebase-index.ts`. `CORPUS_ROOTS` is the clone scope:
`content/**`, root markdown, `locales/**`, application source under `app`,
`components`, `lib`, `server`, `hooks`, `store`, `context`, plus
`prisma/schema.prisma`.

Default ranking prefers **source** over changelog prose so "how does X work"
questions land in implementation. Tools also accept a `scope`:

- `source` — code + prisma (how the product actually works)
- `docs` — markdown / release notes
- `product` — docs + locale UI labels
- `all` — everything (default)

Tools (`tools/search-codebase.ts`):

- **searchCodebase** — ranked keyword search with optional scope/locale.
- **grepCodebase** — regex grep with optional glob + scope (primary tool for
  symbols, routes, env vars, error strings).
- **readCodebaseFile** — read a file or line range a search returned.
- **listCodebaseFiles** — enumerate files matching a glob before grepping an area.

Development walks the repo on disk. Production reads
`lib/ai/support-corpus.generated.json`, written by `scripts/build-support-corpus.ts`
during `prebuild`, and `SUPPORT_SEARCH_TRACE_INCLUDES` traces only that file.
Tracing `app/**` or `lib/**` source makes Turbopack follow imports in those
files (TypeScript, pdf-lib, Playwright, every `next-server` runtime) and puts
~249MB into both `/api/ai/support` and `/api/ai/support/translate-label`.
Picomatch `{ contains: true }` also applies a `/api/ai/support` include to the
nested title translator; `SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE` is the
webpack exclude for that child. The snapshot is the bound that holds on
Turbopack, which is what Vercel builds.

## Agent

`lib/ai/support-agent.ts` — a `ToolLoopAgent`. The `support` task in
`lib/ai/tasks.ts` defaults to direct `gpt-6-luna` at reasoning effort `low`
with an OpenAI reasoning summary (`auto`). Effort `none` produces no summary,
and the support page thought-process rows plus the French title translator
both read that summary, so `sendReasoning: true` on the route stays
meaningful. Instructions tell the model to investigate with
`grepCodebase(scope=source)` → `readCodebaseFile` before answering behavioural
questions, and not to invent features from memory.

The support page sends the current UI `locale` (`en` | `fr`) with every request.
`prepareCall` prepends a hard locale rule so replies follow `/en` or `/fr`.

OpenAI reasoning summaries are still often English over the API. For `/fr`, the
UI translates the locked first-line title through
`POST /api/ai/support/translate-label` (the `reasoning-label` task:
`gpt-6-luna`, effort `none`, 80 output tokens) and keeps a shimmer skeleton
until that title is ready.

## Request flow

`route.ts` validates the request (`schema.ts`), strips the initial greeting, rejects unsupported
file URLs, then streams `supportAgent` via `createAgentUIStreamResponse` with
`options: { locale }`. Errors map to typed JSON (`rate_limit_exceeded`, `service_unavailable`,
`internal_error`) that the client turns into localized messages.

## Environment

- `OPENAI_API_KEY` — required when the resolved support model uses the direct OpenAI provider (the default, and any bare or `openai/<id>` override).
- `AI_GATEWAY_API_KEY` or a Vercel OIDC token — required when `SUPPORT_AGENT_MODEL` is a non-OpenAI gateway id. `aiTaskUnavailableResponse("support")` checks the resolved provider, so a gateway override does not 503 just because `OPENAI_API_KEY` is unset. An empty gateway key falls through to `@vercel/oidc`, which reads `x-vercel-oidc-token` before `VERCEL_OIDC_TOKEN`. A non-empty placeholder key does not, because the gateway SDK sends it and does not replace it.
- `SUPPORT_AGENT_MODEL` — optional override. A bare id or `openai/<id>` uses the direct OpenAI provider and keeps effort `low` plus the reasoning summary. Any other `provider/model` (for example `perplexity/sonar`) is a gateway model. The task's effort is still sent. A non-OpenAI gateway provider may ignore it; that case logs one warning and does not attach the OpenAI reasoning summary. A value on the published shutdown list logs a warning at startup.
- `RESEND_API_KEY`, `SUPPORT_EMAIL` / `SUPPORT_TEAM_EMAIL` — support email delivery.
- `SUPPORT_SEARCH_DEBUG=0` — silence search debug logging in development.
