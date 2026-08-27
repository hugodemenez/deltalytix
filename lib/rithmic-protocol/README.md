# Rithmic R | Protocol API client

TypeScript client for Rithmic's WebSocket + protobuf **R | Protocol API**, used by the
`rithmic-protocol-sync` import path in Deltalytix.

## Layout

- `proto/` — message definitions from RProtocolAPI kit (licensed from Rithmic)
- `etc/rithmic_ssl_cert_auth_params` — SSL auth params from the kit
- `client.ts` — system-info probe, ORDER_PLANT login, account list, **Product RMS commission rates**, fill / order-history fetch, **PNL_PLANT live balances**
- `commission-rates.ts` — `commission_fill_rate` presence bit 64, index, `rate × fill qty`
- `fills-to-trades.ts` — FIFO round-trip matching into Deltalytix `Trade` rows
- `balances.ts` — map `AccountPnLPositionUpdate` → Solde Rithmic balance rows

Proto files are loaded from disk at runtime. On Vercel they must be listed in
`next.config.ts` → `outputFileTracingIncludes` (including Connections server
actions, not only `/api/rithmic-protocol/*`).

## Live balances (Solde Rithmic)

Account balances for the accounts table come from the **PnL plant**:

1. Open `wss://…`, `RequestLogin` with `infra_type = PNL_PLANT` (4).
2. For each trading account, `RequestPnLPositionSnapshot` (template 402).
3. Collect `AccountPnLPositionUpdate` (451) rows (`account_balance`, `cash_on_hand`, …) until `ResponsePnLPositionSnapshot` (403).

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
warning and still saves fills with commission `0`.

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
**skips** the live socket (green). Rithmic may IP-allowlist logins; GitHub-hosted
runners use dynamic IPs, so an account that only allows office IPs will need
a self-hosted runner or an allowlist update. The live step prints gateway,
system, account ids, and `commission_fill_rate` rows — never username/password.

On connect, the user must choose an **account start date**. Sync walks from that
date to today with `ShowFillHistory` in **serial ≤30-day windows** (Rithmic guidance).
`RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS` is only a fallback for legacy connections
that predate the start-date field.

Same-day fills are also pulled via `ReplayExecutions` (ssboe), because on Test the
fill/order history date index often lags UTC “today”.
Order-history fallback also requests dates one at a time. When `ShowFillHistory`
returns empty (rp_code `7 no data`) — common on prop-firm plants such as
**LucidTrading** — sync still tries order-history dates before giving up. Fill
requests use each account’s own FCM/IB from `ResponseAccountList`, not only the
login-level ids.

Protocol API has a **separate conformance** process from R | API+. Conformance is
approved, so production connect points are live; Rithmic Test remains available for
local/dev work. Hosts are never typed by hand in the UI — users pick a connect point
from the list above.
