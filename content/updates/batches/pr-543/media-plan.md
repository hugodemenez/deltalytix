# Changelog media plan: pr-543

## public-api-oauth-developer-docs

- Decision: 2 visuals
- Rationale: The docs page proves where the API is documented and what scopes exist; the Developers page is a separate new surface for app owners.
- Primary/card asset: `public-api-docs.png` — new scene `docs-api-overview` (desktop /{locale}/docs, top of page).
- Additional assets:
  - `developers-oauth-apps.png` — new scene `developers-oauth-apps` (desktop /{locale}/dashboard/developers, clipped to the Your apps card + footer line, seeded "Seed Chart Companion" app).
- Omitted candidates:
  - OAuth consent screen — needs a full authorize flow; text explains it.
  - Add app stepper — multi-step, the list proves the surface.

## settings-api-tokens-authorized-apps

- Decision: 1 visual
- Rationale: One clip of the section shows the order (tokens, authorized apps, docs line) the copy describes.
- Primary/card asset: `settings-connections-api.png` — new scene `settings-connections-api` (desktop /{locale}/dashboard/settings, section#connections; seed token + authorized app).
- Capture-only: the seed app logo points at a broker wordmark, so the scene serves a neutral app glyph for it.
- Omitted candidates:
  - Copy-your-token dialog — one-time state; copy says it's shown once.
  - Revoke confirm — standard dialog.

## buffer-drawdown-counted-profit

- Decision: 0 visuals — a number change; a still could not show the before/after honestly.

## dashboard-chat-step-summaries

- Decision: 0 visuals — needs a live AI response; local capture uses a dummy model key.

## weekly-recap-email-mobile-width

- Decision: 0 visuals — layout fix in an email; text is enough.
