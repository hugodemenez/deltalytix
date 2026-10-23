# Changelog outline: pr-543

Promotion PR: #543 (`main` ← `beta`). Head `1a8f5126` (#560). Base `1ed4c730` (main after #537).

## Release window and evidence

- Tree window: `git diff origin/main origin/beta`.
- Unique product commits: #408 public API v1 + /docs (2026-10-11), #546, #548–#552 API hardening, #553/#555/#557/#558/#559/#560 Settings → Connections + Developers page (2026-10-18 → 10-19), #544 buffer drawdown (2026-10-11), #547 chat Trace UI (2026-10-18), #540 weekly recap mobile (2026-10-11), #554 trade date normalization, #556/#542 Google consent/ads.

## Coverage

- Included: #408, #546, #549, #551, #548, #550, #552, #559 (Developers page) → `public-api-oauth-developer-docs`
- Included: #553, #555, #557, #558, #560 → `settings-api-tokens-authorized-apps`
- Included: #544 → `buffer-drawdown-counted-profit`
- Included: #547 → `dashboard-chat-step-summaries`
- Included: #540 → `weekly-recap-email-mobile-width`
- Covered: #530 Funded Futures Family templates → published `funded-futures-family-account-templates`
- Covered: #541 futures hub "Start free" CTA — copy tweak, Skip
- Skip: #554 entryDate/closeDate normalization at save — invisible data hygiene, no user-visible change
- Skip: #560 token copy dialog overflow — fix to a surface first shipped in this same release
- Skip: #542/#556 Google Ads consent mode and conversions — marketing tracking
- Skip: Prisma `migrate deploy` in Vercel build, request logs (#552), RLS, tests — internal
- Skip: iOS 16px sync time input (ac096c0) — tiny polish

## Entry: public-api-oauth-developer-docs

- Outcome: API v1 (profile, trades, accounts, connections + sync, imports, metrics) with scoped personal tokens or OAuth; docs at /docs with try-it; OAuth app management on /dashboard/developers.
- Dates: 2026-10-11 → 2026-10-19
- Visual moments: docs "What you can do" scope table; Developers page app card.

## Entry: settings-api-tokens-authorized-apps

- Outcome: Settings → Connections shows API tokens first (Create token, shown once, scopes, created/last used, Revoke), then Authorized apps (Revoke), then a developer docs line. API access removed from account menu.
- Dates: 2026-10-18 → 2026-10-19
- Visual moments: the whole Connections section.

## Entry: buffer-drawdown-counted-profit

- Outcome: buffered accounts measure drawdown on above-buffer equity; no-buffer accounts unchanged.
- Dates: 2026-10-11

## Entry: dashboard-chat-step-summaries

- Outcome: "Analyzed in N steps" summary, expandable lookups, inline Approve/Deny.
- Dates: 2026-10-18

## Entry: weekly-recap-email-mobile-width

- Outcome: recap email full width on phones; Outlook/desktop unchanged.
- Dates: 2026-10-11
