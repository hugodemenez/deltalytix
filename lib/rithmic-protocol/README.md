# Rithmic R | Protocol API client

TypeScript client for Rithmic's WebSocket + protobuf **R | Protocol API**, used by the
`rithmic-protocol-sync` import path in Deltalytix.

## Layout

- `proto/` — message definitions from RProtocolAPI kit (licensed from Rithmic)
- `etc/rithmic_ssl_cert_auth_params` — SSL auth params from the kit
- `client.ts` — system-info probe, ORDER_PLANT login, account list, fill / order-history fetch
- `fills-to-trades.ts` — FIFO round-trip matching into Deltalytix `Trade` rows

## Connection sequence (Rithmic)

1. Open `wss://…` (SSL only), send `RequestRithmicSystemInfo`, record `system_name` values, close.
2. Open a new websocket, send `RequestLogin` with the chosen `system_name` (use **Rithmic Test** during conformance).

Default Test endpoint: `wss://rituz00100.rithmic.com:443`.

## Env

```
RITHMIC_PROTOCOL_URI=wss://rituz00100.rithmic.com:443
RITHMIC_PROTOCOL_APP_NAME=DeltalytixRithmicProtocolAPI
RITHMIC_PROTOCOL_APP_VERSION=0.1.0
RITHMIC_PROTOCOL_HISTORY_LOOKBACK_DAYS=90
```

Protocol API has a **separate conformance** process from R | API+. Use Rithmic Test
until Protocol conformance is approved for Paper Trading / Rithmic 01. The gateway
URI is server-configured (env / default) — not editable in the UI.
