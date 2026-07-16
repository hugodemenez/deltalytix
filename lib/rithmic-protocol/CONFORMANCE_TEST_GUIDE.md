# Rithmic Protocol API — tester access guide (Kashyap)

This guide explains how to open Deltalytix, authenticate, and run a **R | Protocol API** sync so Rithmic can verify app name, branding, and fill import.

Contact on Deltalytix side: **Hugo Demenez**.

---

## What you are testing

| Item | Value |
| --- | --- |
| Product | Deltalytix |
| Integration | **Rithmic Protocol** (server-side WebSocket + protobuf) |
| App name sent on login | `DeltalytixRithmicProtocolAPI` |
| Default Test gateway | `wss://rituz00100.rithmic.com:443` |
| UI label | **Rithmic Protocol** (under Direct Account Sync) |

Protocol conformance is **separate** from the older R \| API+ sidecar path. Until Paper / Rithmic 01 are approved for Protocol, use **Rithmic Test**.

---

## 1. Open the Deltalytix build that has Protocol sync

Use the preview deployment for the Protocol sync PR (`#326`):

```
https://deltalytix-git-cursor-rithmic-protocol-sync-b16d-deltalytix.vercel.app/en/dashboard
```

Notes:

- If Vercel shows a login gate, ask Hugo to grant preview access (or send a shareable invite).
- After the PR is merged to `beta`, the same Import → **Rithmic Protocol** flow is available on the production Deltalytix site.

Language: `/en/...` or `/fr/...` both work.

---

## 2. Sign in to Deltalytix

You need a Deltalytix account (this is **not** your Rithmic username).

**Preferred (Rithmic domain):**

1. Hugo resets / shares credentials for the existing account  
   `dev.null@rithmic.com`  
   (any `@rithmic.com` email is treated as Plus in Deltalytix).
2. Or create a new Deltalytix account with your own `@rithmic.com` address and confirm email if prompted.

**Alternative:** Hugo invites you with a personal email; he can enable Plus on that account if needed.

Sign-in methods on the site: email/password or Google (depending on the build).

---

## 3. Open Rithmic Protocol sync

1. After login you land on the **Dashboard**.
2. Open **Import** (same entry point as CSV / Tradovate / DxFeed syncs).
3. Under **Direct Account Sync**, choose **Rithmic Protocol**  
   (description: “Server-side Protocol API sync”).
4. Continue to the connect screen.

You should see:

- Title **Rithmic Protocol Sync**
- **Connect** / **Sync all** actions
- Footer branding: **Trading Platform by Rithmic** + **Powered by OMNE**, plus copyright lines

That footer is intentional for Protocol conformance screenshots.

---

## 4. Connect with your Rithmic Test credentials

Click **Connect** and fill:

| Field | What to enter |
| --- | --- |
| System | **Rithmic Test** |
| Gateway | leave default `wss://rituz00100.rithmic.com:443` unless Rithmic gives you another Protocol URI |
| Username | your Rithmic Test user id |
| Password | your Rithmic Test password |

Click **Connect**.

Expected success:

- Toast that the Protocol account connected
- A saved connection row showing your Rithmic username and linked trading account id(s) (e.g. `HD…`)

Expected failure examples:

- Wrong password / system → auth error toast
- Empty Test book → connect can still succeed; sync may import **0** closed trades (that is OK)

Do **not** use Paper Trading / Rithmic 01 for Protocol until Rithmic has approved this app name for those systems.

---

## 5. Run a sync

1. Expand the connection row (or use **Sync all**).
2. Click **Sync now**.
3. Wait for the completion toast.

What sync does (server-side):

1. Logs into ORDER_PLANT with app name `DeltalytixRithmicProtocolAPI`
2. Lists accounts
3. Fetches fill / order history via Protocol
4. Matches closed round-trips and saves them into Deltalytix

Success with **0 trades** is valid for an empty Test account. To validate end-to-end import, place a small round-trip on Test in R|Trader (or another approved Test client), then sync again and confirm the closed trade appears on the Deltalytix dashboard.

---

## 6. Screenshots Rithmic typically wants

Capture:

1. **Connect dialog** — system = Rithmic Test, gateway URI visible  
2. **Protocol sync page** — Rithmic + OMNE logos and copyright footer visible  
3. **After connect** — saved connection with account id(s)  
4. **After sync** — success toast and (if available) imported trade(s) on the dashboard

Optional: browser Network tab showing `POST /api/rithmic-protocol/sync` returning `200` with `success: true`.

---

## 7. Quick troubleshooting

| Symptom | What to check |
| --- | --- |
| Preview site asks for Vercel login | Hugo must share access to the preview deployment |
| “Rithmic Protocol” missing from Import | Wrong deployment (use the PR preview URL above, or wait for merge to `beta`) |
| Connect fails | System must be **Rithmic Test**; confirm username/password against R\|Trader Test |
| Sync finishes with 0 trades | Normal if Test has no closed fills; place a Test round-trip and sync again |
| Sync hangs / times out | Retry once; if it persists, send Hugo the UTC time + Rithmic account id |

---

## For Hugo (prep before sending this guide)

1. Reset password for `dev.null@rithmic.com` (or create a dedicated `@rithmic.com` tester) and send credentials to Kashyap **out of band** — never commit them.
2. Ensure Kashyap can open the Vercel preview (team invite / shareable access).
3. Confirm the latest Protocol preview is **Ready** (branch `cursor/rithmic-protocol-sync-b16d`).
4. Optionally place one closed Test round-trip on the shared Test account so sync has a non-empty result.

---

## Reference

- Client / env notes: [`README.md`](./README.md)
- Pull request: Deltalytix repo PR `#326`
- Preview (stable alias):  
  `https://deltalytix-git-cursor-rithmic-protocol-sync-b16d-deltalytix.vercel.app`
