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

The corpus is read from disk at runtime, so `next.config.ts` traces it into the
serverless bundle via `SUPPORT_SEARCH_TRACE_INCLUDES`.

## Agent

`lib/ai/support-agent.ts` — a `ToolLoopAgent`. Model defaults to `openai/gpt-5-mini`
(via the Vercel AI Gateway; override with `SUPPORT_AGENT_MODEL`). Instructions tell
the model to investigate with `grepCodebase(scope=source)` → `readCodebaseFile`
before answering behavioural questions, and not to invent features from memory.

The support page sends the current UI `locale` (`en` | `fr`) with every request.
`prepareCall` appends a one-line locale hint so replies follow `/en` or `/fr`.

## Request flow

`route.ts` validates the request (`schema.ts`), strips the initial greeting, rejects unsupported
file URLs, then streams `supportAgent` via `createAgentUIStreamResponse` with
`options: { locale }`. Errors map to typed JSON (`rate_limit_exceeded`, `service_unavailable`,
`internal_error`) that the client turns into localized messages.

## Environment

- `AI_GATEWAY_API_KEY` — required for the agent to run (Vercel AI Gateway).
- `SUPPORT_AGENT_MODEL` — optional model override.
- `RESEND_API_KEY`, `SUPPORT_EMAIL` / `SUPPORT_TEAM_EMAIL` — support email delivery.
- `SUPPORT_SEARCH_DEBUG=0` — silence search debug logging in development.
