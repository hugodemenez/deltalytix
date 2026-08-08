# Deltalytix Support Assistant

The support assistant answers product questions from the real repository and, crucially, never leaves a user stuck: a human hand-off is always one click away.

## Two escape hatches, always available

The UI (`app/[locale]/(landing)/support/page.tsx`) owns escalation, not the model:

- A **Request Human Support** button in the header, plus a **Talk to a human** starter chip, open the contact form directly — no model round-trip.
- After the user's first message, an inline **human hand-off** prompt appears under the conversation so a stuck user is never more than one click from a person.
- The model can _also_ escalate by calling `askForEmailForm`; when it does, the UI opens the same contact form pre-filled with the model's summary.

This is deliberate: routing "I want a human" through the model is exactly the loop we removed.

## Knowledge: real search over the repo

The agent reads the actual codebase through `lib/ai/search-codebase.ts`, backed by an
in-memory index built in `lib/ai/codebase-index.ts` (`CORPUS_ROOTS` defines the scope:
`content/**`, root markdown, `locales/**`, and application source under `app`, `components`,
`lib`, `server`, `hooks`, `store`, `context`, plus `prisma/schema.prisma`).

Tools exposed to the model (`tools/search-codebase.ts`):

- **searchCodebase** — ranked keyword search (TF-IDF-ish scoring, doc/locale weighted above
  source, locale-aware) returning the strongest files with surrounding context lines.
- **grepCodebase** — regex grep with an optional glob filter, for exact strings (UI labels,
  error messages, env vars, route names).
- **readCodebaseFile** — read a file or line range a search returned.
- **listCodebaseFiles** — enumerate files matching a glob (e.g. every release note).

The corpus is read from disk at runtime, so `next.config.ts` traces it into the serverless
bundle via `SUPPORT_SEARCH_TRACE_INCLUDES`.

## Agent

`lib/ai/support-agent.ts` — a `ToolLoopAgent`. Model defaults to `openai/gpt-5-mini` (via the
Vercel AI Gateway; override with `SUPPORT_AGENT_MODEL`). The system prompt requires the model to
search before answering, search at least twice before concluding something does not exist, and
escalate rather than ask a second round of clarifying questions.

## Request flow

`route.ts` validates the request (`schema.ts`), strips the initial greeting, rejects unsupported
file URLs, then streams `supportAgent` via `createAgentUIStreamResponse`. Errors map to typed
JSON (`rate_limit_exceeded`, `service_unavailable`, `internal_error`) that the client turns into
localized messages.

## Environment

- `AI_GATEWAY_API_KEY` — required for the agent to run (Vercel AI Gateway).
- `SUPPORT_AGENT_MODEL` — optional model override.
- `RESEND_API_KEY`, `SUPPORT_EMAIL` / `SUPPORT_TEAM_EMAIL` — support email delivery.
- `SUPPORT_SEARCH_DEBUG=0` — silence search debug logging in development.
