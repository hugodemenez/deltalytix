# Rithmic R | Protocol API client

TypeScript client for Rithmic's WebSocket + protobuf **R | Protocol API**, used by the
`rithmic-protocol-sync` import path in Deltalytix.

## Layout

- `proto/` — message definitions from RProtocolAPI kit (licensed from Rithmic)
- `etc/rithmic_ssl_cert_auth_params` — SSL auth params from the kit
- `client.ts` — system-info probe, ORDER_PLANT login, account list, fill / order-history fetch
- `fills-to-trades.ts` — FIFO round-trip matching into Deltalytix `Trade` rows

Proto files are loaded from disk at runtime. On Vercel they must be listed in
`next.config.ts` → `outputFileTracingIncludes` (including Connections server
actions, not only `/api/rithmic-protocol/*`).

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
```

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
