# Changelog outline: pr-575

Promotion PR: #575 (`main` ← `release/2026-10-29`). Head `24c9ab8d` (#563). Base `9be0f4f0` (main after hotfix #574).

This is not a promotion of `beta` tip `e9981bed`. That tip is #573 (MCP server), merged to `beta` on 2026-10-29 and excluded from this release.

## Release window and evidence

- Tree window: `git diff origin/main...24c9ab8d` (three-dot, commits reachable from the release head and not from `main`).
- Product commits on the release head, newest first: #563 daily sync default (2026-10-24, first commit 2026-10-20), #572 email logos (2026-10-24), #571 Try it with AI (2026-10-24), #564 Use another account (2026-10-24, first commit 2026-10-20), #570 newsletter PNGs (2026-10-24), #569 Rithmic split orders (2026-10-23), #568 docs token sheet (2026-10-23), #567 Try this route lookup (2026-10-23).
- Non-first-parent commits `3ec57979`, `c314faea`, and `02ab58f2` are the pre-squash versions of #571, #563, and #564. Same outcomes; do not write separate entries.

## Coverage

- Included: #567, #568 → `api-docs-try-this-route`
- Included: #571 → `api-docs-try-with-ai`
- Included: #564 → `oauth-consent-use-another-account`
- Included: #563 → `new-connections-daily-end-of-day-sync`
- Included: #569 → `rithmic-split-order-sizes`
- Covered: #566 Lucid fill double-count and invented overnight trades → already on `main` (`9cba67ff`), published before this release. Do not re-claim.
- Covered: #572 Claude/ChatGPT/Grok email logos → identical blobs already on `main` via hotfix #574. Do not list as new.
- Skip: #573 MCP server — on `beta` tip only; not in this head.
- Skip: #565 contributor timezone — PR still open; not in this head.
- Skip: #570 newsletter PNGs (`public/email/release-developers.png`, `release-consent.png`, `release-connections.png`, `deltalytix-mark.png`) — added in #570, then deleted by #572. Absent from both `main` and this head, and not referenced by any email template. Do not claim they shipped.
- Skip: tests, OpenAPI path-normalization internals, and the dedupe implementation names — covered by the user-facing entries above.

## Entry: api-docs-try-this-route

- User outcome: On the API docs, **Try this route** loads the live operation for each documented API route, and a token you just generated stays visible, unmasked, next to **Copy** until you close the sheet.
- Audience: Traders and developers trying the API from the docs.
- Surfaces: [API documentation](/en/docs) and [documentation API](/fr/docs). Panel title **Try this route** / **Essayer cette route**. Token sheet actions **Generate docs token**, **Use demo token**, **Copy** (FR: **Générer un token docs**, **Utiliser un token démo**, **Copier**).
- Dates: 2026-10-23 → 2026-10-23
- Grouping rationale: Both changes are the same docs playground. #567 makes the panel match the live spec; #568 makes the secret you just created readable. One story: you can actually try a route and copy the token.
- Important details:
  - Before #567, guides used full paths such as `/api/v1/trades` while the OpenAPI document lists `/v1/trades` under a server URL ending in `/api`. The panel showed "This endpoint is not available in the live OpenAPI document." The lookup now strips that server base. Requests still go to the same-origin `/api/...` path.
  - `/oauth/authorize` is a browser redirect, not an API call. Its panel still explains that it cannot be sent from the docs. Multipart uploads and form-encoded bodies still cannot be sent from the panel; the copy should not claim every HTTP shape has a live **Send** button.
  - Before #568, **Generate docs token** and **Use demo token** closed the sheet immediately and left the token masked, so you could not copy it. The sheet now stays open with the token shown until you close it. Creation itself is unchanged. The secret is still shown only in that open sheet.
- Try it: Open a route guide on `/docs`, use **Try this route**, then **Generate docs token** (signed in) or **Use demo token** (read-only sample data).
- Do not repeat the public-API announcement in `public-api-oauth-developer-docs`. That entry already said most guides let you try a request. This entry is the follow-up: the panel matches the spec, and the new token stays on screen.

### Story options

- One short lead: the try panel now finds each documented route, and the token you generate stays up until you close it.
- Two short paragraphs, one for the panel and one for the token. No engineering detail about path prefixes.

### Visual moments

- A route guide with the **Try this route** panel open and a successful operation (method, path, **Send**), which shows the panel is no longer the "not in the OpenAPI document" message.
- The token sheet after **Generate docs token**, secret visible beside **Copy**, sheet still open.

### Visual caveats

- A generated token is a secret. Do not capture a real token. A demo token is still a credential-shaped string.
- The "it was broken" claim is a before state we should not fake. Text can carry the fix; a still of a working panel does not prove the old error is gone.
- `/oauth/authorize`, multipart, and form-encoded routes are exceptions. A single screenshot must not imply those have a **Send** button.

## Entry: api-docs-try-with-ai

- User outcome: The docs header has **Try it with AI** with three buttons, **Claude**, **ChatGPT**, and **Grok**. Each opens that assistant in a new tab with a prompt that points at this site's docs and OpenAPI document and asks for a step-by-step first call (create a token, authenticate, curl examples).
- Audience: Someone who wants a guided first call rather than reading the reference alone.
- Surfaces: Every docs view, because the guides share one page. English label **Try it with AI**; button names **Claude**, **ChatGPT**, **Grok**; accessible names **Try it with Claude**, **Try it with ChatGPT**, **Try it with Grok**. French: **Essayer avec l’IA**, **Essayer avec Claude**, **Essayer avec ChatGPT**, **Essayer avec Grok**. Links: `https://claude.ai/new`, `https://chatgpt.com/`, `https://grok.com/`, each with a prefilled `q`. The docs and OpenAPI URLs in the prompt use the current origin.
- Dates: 2026-10-24 → 2026-10-24
- Grouping rationale: Distinct from the in-page playground. You leave Deltalytix and continue in an assistant. Own title.
- Important details: Buttons are on the docs header in both locales, not only the landing page. This is not the email logo hotfix. Do not mention email logos.
- Try it: [API documentation](/en/docs) / [documentation API](/fr/docs), header row under the intro.

### Story options

- Two or three sentences plus the three names. No prompt dump.

### Visual moments

- Docs header showing **Try it with AI** and the three labeled buttons. EN and FR labels differ, so a capture would need both locales if used.

### Visual caveats

- The destination tabs are third-party. Do not screenshot Claude, ChatGPT, or Grok.
- The row is a static header. Motion would not add anything.

## Entry: oauth-consent-use-another-account

- User outcome: On the OAuth consent screen, under the signed-in email, **Use another account** signs you out and sends you to sign-in, then back to this same consent screen.
- Audience: A trader approving an app while the browser is signed into a different Deltalytix account.
- Surfaces: OAuth consent screen (`/oauth/authorize`). Labels: **Use another account** / **Changer de compte**. The email line is **Signed in as {email}**. There is no dashboard settings control for this.
- Dates: 2026-10-20 → 2026-10-24
- Grouping rationale: One control, one screen.
- Important details: The return target has to be this authorization request (`oauth/authorize?...`). Anything else is dropped, so the link is not a general sign-out. After sign-in you land on the same app's consent screen, not the dashboard. Copy should not invent a new account-switcher elsewhere.
- Try it: Start an app authorization, then use the link under the email. No public route to link as "go here to try it" without a client id.

### Story options

- One short paragraph. Name the label and what happens next.

### Visual moments

- Consent card with the email and the underlined **Use another account** link.

### Visual caveats

- Needs a real authorize request and a signed-in user. Local capture does not have a third-party OAuth client ready. Text is enough.

## Entry: new-connections-daily-end-of-day-sync

- User outcome: A new connection that can sync on a schedule starts with a daily sync at the existing **After close** time (22:00 UTC) instead of manual-only. You can change or turn off that schedule. Connections you already have, including ones you set to manual, stay as they are.
- Audience: Traders connecting Tradovate, DxFeed, Rithmic Protocol, Interactive Brokers, or IG.
- Surfaces: [Connections](/en/dashboard/connections) / [Connexions](/fr/dashboard/connections). Schedule control already documented in `flexible-connection-sync-schedules`. Preset labels: **After close** / **Après clôture**, and the longer **After Market Close (22:00 UTC)** / **Après clôture (22:00 UTC)**. 22:00 UTC is 18:00 in New York during daylight time and 17:00 during standard time; prefer the preset name over a timezone lecture.
- Dates: 2026-10-20 → 2026-10-24
- Grouping rationale: One default change. Do not reopen the whole schedule feature.
- Important details:
  - Applies only when the connection row is created, and only for services in the daily-sync list: Tradovate, DxFeed, Rithmic Protocol, Interactive Brokers, IG. A caller-supplied time still wins.
  - Update of an existing row does not fill in a default. A connection already switched to manual stays manual.
  - Thor and the legacy Rithmic connection are not in that list; they stay manual-only, as the earlier schedule entry said.
  - Do not say "all connections now sync daily."
- Try it: Connect one of those providers, then check the next-sync time or **Schedule sync** on Connections. Point at the existing schedule entry rather than re-explaining every interval.

### Story options

- Short lead plus one sentence on who it applies to and that existing connections are left alone.
- Link the earlier schedule changelog instead of repeating the picker.

### Visual moments

- None — the change is a default on create. A screenshot of the existing picker would repeat `flexible-connection-sync-schedules` and would not show "new connections only."

### Visual caveats

- Would require creating a fresh broker connection against a live provider. Do not fake it.

## Entry: rithmic-split-order-sizes

- User outcome: Rithmic Protocol sync no longer stores the wrong contract size when one order arrives as a single full fill in history and as several pieces in the live replay. It also no longer inserts a second copy of a trade whose contracts are already in the journal under a different pairing (for example after an ATAS import).
- Audience: Traders whose journal is filled by Rithmic Protocol sync, especially if they also imported the same fills another way.
- Surfaces: Rithmic Protocol sync into the journal. No new control.
- Dates: 2026-10-23 → 2026-10-23
- Grouping rationale: One sync-correctness fix with two visible symptoms (wrong size, duplicate rows). Same pipeline.
- Important details:
  - Fills that share account, symbol, side, and price within 2 seconds, or that share a basket id, are treated as one order. If history has that order, its volume is kept and the replay pieces are dropped. Within one source, the pieces become one fill with the total size.
  - On save, a Rithmic trade is skipped when stored rows for the same account and instrument already cover its entry and exit contracts (same side, same price, within 2 minutes), even if those rows pair the fills differently.
  - A size mismatch with a stored fill pair is no longer treated as "the same row" in a way that lets commission backfill overwrite the stored row's commission.
  - This is not the Lucid double-count / invented overnight trades fix (#566), which is already on `main`. Do not mention that bug, Lucid, or those dates.
  - Do not promise that already-wrong historical rows are rewritten. The change is in sync going forward.
- Try it: Nothing to click. The next Rithmic Protocol sync uses the new matching.

### Story options

- Two sentences: wrong size on split orders, then duplicate rows next to trades you already had.
- Avoid fill-id examples and function names.

### Visual moments

- None — a trade table still would not show the absent duplicate, and we must not invent before/after rows.

### Visual caveats

- Needs a private Rithmic account with the bad fill pattern. Do not capture customer data.
