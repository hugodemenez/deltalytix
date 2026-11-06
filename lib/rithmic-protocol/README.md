# Rithmic R | Protocol API client

TypeScript client for Rithmic's WebSocket + protobuf **R | Protocol API**, used by the
`rithmic-protocol-sync` import path in Deltalytix.

## Layout

- `proto/` — message definitions from RProtocolAPI kit (licensed from Rithmic)
- `etc/rithmic_ssl_cert_auth_params` — SSL auth params from the kit
- `client.ts` — system-info probe, ORDER_PLANT login, account list, **Product RMS commission rates**, fill / order-history fetch, **PNL_PLANT live balances and per-symbol nets**
- `commission-rates.ts` — `commission_fill_rate` presence bit 64, index, `rate × fill qty`
- `cme-session.ts` — CME Globex weekly close (Friday 17:00 America/Chicago) used to anchor ShowFillHistory
- `opening-position.ts` — `P_0 = P_end − net(fills)` from the PnL plant snapshot; seeds FIFO instead of rewriting fills
- `fill-ledger.ts` / `fill-ledger-store.ts` — durable fill upsert keyed by identity, then FIFO from the ledger
- `lookback.ts` — ReplayExecutions window (7d default, 2d fallback)
- `history-fallback.ts` — order-history when any ShowFillHistory window is empty
- `fills-to-trades.ts` — FIFO round-trip matching into Deltalytix `Trade` rows
- `balances.ts` — map `AccountPnLPositionUpdate` → Solde Rithmic balance rows; `InstrumentPnLPositionUpdate` → per-symbol net

Proto files are loaded from disk at runtime. On Vercel they must be listed in
`next.config.ts` → `outputFileTracingIncludes` (including Connections server
actions, not only `/api/rithmic-protocol/*`).

## Live balances (Solde Rithmic)

Account balances for the accounts table come from the **PnL plant**:

1. Open `wss://…`, `RequestLogin` with `infra_type = PNL_PLANT` (4).
2. For each trading account, `RequestPnLPositionSnapshot` (template 402).
3. Collect `AccountPnLPositionUpdate` (451) rows (`account_balance`, `cash_on_hand`, …) until `ResponsePnLPositionSnapshot` (403).
   Interleaved `InstrumentPnLPositionUpdate` (450) rows carry `net_quantity` per exact symbol (`P_end`). A completed snapshot that omits a symbol means that symbol is flat.

Server action: `getRithmicProtocolBalancesAction` (uses encrypted Connection credentials).
This is separate from the classic R | API+ HTTP `/balances` path.

Every real fetch opens a WebSocket and performs a full `PNL_PLANT` login, so the
action is throttled per user via `fetch-throttle.ts`:

- automatic fetches (accounts widget mount) reuse a cached value for 60s;
- the refresh button bypasses the TTL but still cannot fetch more than once
  every 15s;
- concurrent callers share one in-flight session;
- the sweep has a 30s wall-clock budget (15s per message), so one silent
  account cannot burn the budget of the accounts behind it;
- the accounts table passes `protocolEnabled` so users with no Protocol-linked
  account never reach the gateway at all;
- disconnecting a Protocol connection invalidates that user's throttle bucket
  so Solde values for the removed accounts are not served for the rest of the
  TTL;
- a timeout or reject on one account skips that account and still returns
  balances already collected for the others.

If a connection has no cached `accountIds`, the action lists them once and
writes them back onto **that** Connection row (`id`), without touching
`lastSyncedAt` or the connections-page cache — viewing Solde Rithmic is not a
sync.

The cache is module scope, so on serverless it is per-instance and best-effort —
enough to collapse one browsing session's mounts, not a global rate limiter.

## Connection sequence (Rithmic)

1. Open `wss://…` (SSL only), send `RequestRithmicSystemInfo`, record `system_name` values, close.
2. Open a new websocket, send `RequestLogin` with the chosen `system_name` (e.g. `Rithmic 01`, `Rithmic Paper Trading`).

## Connect points

Post-conformance production connect points, all on port **443**. Rithmic publishes
them as bare hosts; Protocol needs the `wss://` scheme, so `systems.ts` builds
`wss://<host>:443` (see `gatewayUri`).

| id | Location | Host |
| --- | --- | --- |
| `core` | Core (Chicago) | `rprotocol.rithmic.com` |
| `nyc` | New York | `rprotocol-nyc.rithmic.com` |
| `colo75` | Colo75 (Aurora) | `rprotocol-colo75.rithmic.com` |
| `br` | Sao Paolo | `rprotocol-br.rithmic.com` |
| `ie` | Ireland | `rprotocol-ie.rithmic.com` |
| `de` | Frankfurt | `rprotocol-de.rithmic.com` |
| `za` | Cape Town | `rprotocol-za.rithmic.com` |
| `in` | Mumbai | `rprotocol-in.rithmic.com` |
| `sg` | Singapore | `rprotocol-sg.rithmic.com` |
| `hk` | Hong Kong | `rprotocol-hk.rithmic.com` |
| `kr` | Seoul | `rprotocol-kr.rithmic.com` |
| `jp` | Tokyo | `rprotocol-jp.rithmic.com` |
| `au` | Sydney | `rprotocol-au.rithmic.com` |
| `test` | Rithmic Test (UAT) | `rituz00100.rithmic.com` |

The user picks a connect point and a system when connecting; the chosen `gatewayId`
is stored with the connection, so existing UAT connections keep hitting UAT.
Unknown or missing ids fall back to the deployment default.

## Env

```
RITHMIC_PROTOCOL_GATEWAY=core          # default connect point id (see table)
RITHMIC_PROTOCOL_URI=                  # full URI override, wins over _GATEWAY (UAT / local proxy)
RITHMIC_PROTOCOL_ALLOW_TEST_GATEWAY=   # show UAT in the picker; defaults to true outside production
RITHMIC_PROTOCOL_APP_NAME=DeltalytixRithmicProtocolAPI
RITHMIC_PROTOCOL_APP_VERSION=0.1.0
RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS=30
RITHMIC_PROTOCOL_REPLAY_LOOKBACK_DAYS=7   # ReplayExecutions ssboe window; falls back to 2d on error

# Live e2e only (`bun run test:e2e:rithmic`). Username/password via secrets; never commit.
RITHMIC_PROTOCOL_E2E_USERNAME=
RITHMIC_PROTOCOL_E2E_PASSWORD=
RITHMIC_PROTOCOL_E2E_SYSTEM_NAME=Rithmic Paper Trading   # optional
RITHMIC_PROTOCOL_E2E_GATEWAY=core                        # optional id or wss:// URI
RITHMIC_PROTOCOL_E2E_ACCOUNT_ID=                         # optional pin
```

## Product RMS commissions

Protocol fill messages have no fee fields. Sync loads **Product RMS**
(`RequestProductRmsInfo` template 306 / `ResponseProductRmsInfo` 307,
`commission_fill_rate`, presence bit 64) and charges **rate × fill quantity**
on each fill — the same source as R | API+ `ProductRmsListInfo` and the Orders
CSV Commission Fill Rate. Round-trip commission is entry + exit.

Current RMS config is used, not historical rates. A Product RMS failure logs a
warning and still saves fills with commission `0`. Trade identity ignores the
rate so a resync matches rows first stored with `commission: 0` and updates
that existing row instead of inserting a duplicate.

## Live e2e / CI

Default `bun run test` excludes `*.e2e.test.ts`. The live suite skips unless
username + password are set:

```bash
# local: put creds in `.env.e2e.local` (gitignored via `.env*.local`)
set -a && source .env.e2e.local && set +a
bun run test:e2e:rithmic
```

GitHub Actions (`.github/workflows/rithmic-protocol-e2e.yml`):

| Name | Kind | Required |
| --- | --- | --- |
| `RITHMIC_PROTOCOL_E2E_USERNAME` | Actions **secret** | yes |
| `RITHMIC_PROTOCOL_E2E_PASSWORD` | Actions **secret** | yes |
| `RITHMIC_PROTOCOL_E2E_SYSTEM_NAME` | Actions **variable** | no (default `Rithmic Paper Trading`) |
| `RITHMIC_PROTOCOL_E2E_GATEWAY` | Actions **variable** | no (default `core`) |

Without the two secrets the workflow still runs the proto/unit checks and
**skips** the live socket (green). GitHub-hosted `ubuntu-latest` can open WSS
to Core (`RequestRithmicSystemInfo` works) but `RequestLogin` has been silent
from the same IPv4 peer. Rithmic does not offer a customer IP allowlist;
runners egress from Azure, while in-app reconnect goes through Vercel. On
Actions a silent login timeout or a TLS/socket reset before WSS opens is
**skipped** (Azure egress to Core is flaky). A login reject or credential
error still fails. Set
`RITHMIC_PROTOCOL_E2E_REQUIRE_LOGIN=1` to fail on those flakes (self-hosted runner
or a Vercel-path job). The live step prints DNS, egress IP, socket
remote/local, and template traffic — never username/password. Login uses a
second socket after the system-info probe (the plant closes the probe with
code 1000).

On connect, the user must choose an **account start date**. Sync walks from the
most recent **CME Globex weekly close** (Friday 17:00 America/Chicago) at or
before that date to today with `ShowFillHistory` in **serial ≤30-day windows**
(Rithmic guidance). Empty prefix windows mean the plant does not retain that
far; the broker snapshot then supplies `P_0`. `RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS`
is only a fallback for legacy connections that predate the start-date field.

After fills land, a **PnL plant position snapshot** (`RequestPnLPositionSnapshot`
402 / `InstrumentPnLPositionUpdate` 450) gives live net `P_end` per exact
symbol. Opening inventory is `P_0 = P_end − net(fills)`. When `P_0` is a
known integer, FIFO is seeded with a synthetic opening lot (never stored as a
fill). Closes against that lot are tagged `rithmic-protocol-opening-seed` and
attributed **0 PnL** (closing fill price on both sides) rather than guessing
the missing entry. A non-integer `P_0` or unpriceable close refuses admin live
rebuild with `OPENING_POSITION_UNKNOWN`. Snapshot timeout/plant failure warns
and continues on ordinary sync; admin live rebuild refuses with
`POSITION_SNAPSHOT_UNAVAILABLE`. Fills are never trimmed from a terminal net.

Fills are **upserted into `RithmicProtocolFill` first** (unique on
`userId` + `fillIdentityKey`), including split order pieces. FIFO then derives
`Trade` rows from the merged ledger, not from a single plant snapshot. A later
sync that recovers a missing window closes leftover lots instead of inventing
an overnight round-trip from incomplete history. Existing accounts backfill on
the next sync; Trade rows keep their UUID (and journal notes) when the fill
pair rematches. Unannotated Protocol trades whose pair is no longer produced,
but whose legs are both on the ledger, are removed as overnight phantoms.
Annotated rows are kept.

`ReplayExecutions` uses an ssboe window of up to **7 calendar days**
(`RITHMIC_PROTOCOL_REPLAY_LOOKBACK_DAYS`), never longer than the sync range.
Many plants only retain about **2 days** and simply return a shorter slice; a
hard reject retries 2d so those plants keep working. Already-seen identity keys
are dropped from Replay / order-history / ShowFillHistory before upsert.
History-stream exchange notifications are kept (some plants emit fills only
that way). `dedupeFills` collapses the same
`accountId + fill_date + fill_id + symbol + side + price + size`
— `fill_date` is the exchange trade date (rolls ~17:00 CT), not a UTC calendar
day; `ssboe` is only a fallback when `fill_date` is absent. Replay sometimes
sends `basketId_fillId`; that canonicalizes to the trailing fill id. The old
key omitted symbol/fingerprint and dropped a distinct MNQ sell when another
instrument reused `fill_id` on the same session. The older composite-field key
(raw transaction type, ssboe, basket) kept history `BUY` and replay enum `1`
as two fills, and FIFO joined them into `fillId-fillId` journal rows (2× qty / PnL).
Order-history fallback also requests dates one at a time. When any
`ShowFillHistory` window is empty (rp_code `7 no data`) — common on prop-firm
plants — sync still tries order-history dates before giving up. Fill requests
use each account’s own FCM/IB from `ResponseAccountList`, not only the
login-level ids.

Do **not** expire open lots at the Globex/CME session roll. Real multi-day
holds stay open until a matching fill arrives on the ledger.

Protocol API has a **separate conformance** process from R | API+. Conformance is
approved, so production connect points are live; Rithmic Test remains available for
local/dev work. Hosts are never typed by hand in the UI — users pick a connect point
from the list above.
