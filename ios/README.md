# Deltalytix iOS — evaluation & WebView shell spike

Spike for a native iOS app that reuses the existing Next.js dashboard (same strategy as the desktop Native SDK shell in PR #292).

## Recommendation

| Approach | Verdict | Time to MVP | Auth / OAuth | App Store | Offline |
|----------|---------|-------------|--------------|-----------|---------|
| **Capacitor WebView** (this spike) | **Recommended** | Days | Good with deep links + Browser plugin | Mature path | Limited (hosted app) |
| Native SDK mobile (`vercel-labs/native`) | Watch / parity with desktop | Weeks | Same as WebView once shell works | Experimental | Limited |
| Expo / React Native | Not for v1 | Months | Re-implement auth client | Mature | Possible with sync layer |

### Why Capacitor over Native SDK for iOS v1

1. **Same product model as desktop** — `capacitor.config.ts` points `server.url` at `https://www.deltalytix.app/dashboard` (or local dev URL). No dashboard rewrite.
2. **App Store ready** — Capacitor is widely used for WKWebView shells; signing, TestFlight, and review patterns are well documented.
3. **Deep links & OAuth** — `@capacitor/app` and `@capacitor/browser` cover custom URL schemes, Universal Links, and `ASWebAuthenticationSession` for Google OAuth (which blocks embedded WebViews).
4. **Lower toolchain friction** — Xcode + CocoaPods only. Native SDK iOS additionally requires Zig, building `libnative-sdk.a` for `aarch64-ios`, and linking a C ABI (see `ios/native-sdk/README.md`).
5. **Existing mobile web UI** — The dashboard already has responsive mobile layouts, carousels, and iOS mailbox deep links (`lib/open-mailbox.ts`).

### When to revisit Native SDK mobile

- Desktop shell (PR #292) stabilizes on macOS and you want **one Zig runtime** across desktop + mobile.
- You need native chrome (UIKit header, GPU widgets, `.native` UI) from the Native SDK examples.
- Native SDK iOS graduates from experimental to supported in `@native-sdk/cli`.

### Why not Expo / React Native for v1

- Would duplicate the entire dashboard UI and server-action data layer.
- Only justified if you later need heavy offline-first sync, native charts, or push-driven workflows that cannot live in the web app.

---

## Folder layout

```
ios/
├── README.md                 # This file
├── docs/
│   └── auth-deep-links.md    # Supabase OAuth, magic links, Universal Links
├── capacitor/                # ★ Recommended spike (Capacitor 7 + WKWebView)
│   ├── capacitor.config.ts   # Remote URL → deltalytix.app/dashboard
│   ├── package.json
│   ├── www/                  # Placeholder (remote server.url is used)
│   └── ios/                  # Generated Xcode project (committed)
│       └── App/
└── native-sdk/               # Alternative: Zig + Native SDK C ABI (experimental)
    └── README.md
```

---

## Prerequisites (macOS)

| Tool | Notes |
|------|-------|
| Xcode 15+ | iOS Simulator + signing |
| CocoaPods | `sudo gem install cocoapods` |
| Bun | Repo package manager (`AGENTS.md`) |

Linux/CI can run `bun install` and `cap sync`, but **building and running in Simulator requires a Mac**.

---

## Quick start — iOS Simulator

### Production URL (default)

Loads `https://www.deltalytix.app/dashboard` in a full-screen WKWebView.

```bash
bash scripts/ios-bootstrap.sh
cd ios/capacitor
bun run open          # opens Xcode
```

In Xcode: select an iPhone simulator → **Run** (⌘R).

Or from CLI (requires Xcode command line tools):

```bash
cd ios/capacitor
bun run run:sim
```

### Local dev (Next.js on port 3000)

```bash
# Terminal 1 — Postgres + .env.local per AGENTS.md
bash scripts/dev.sh

# Terminal 2
DELTALYTIX_IOS_URL=http://127.0.0.1:3000/dashboard bash scripts/ios-bootstrap.sh
cd ios/capacitor && bun run open
```

For local auth without Supabase, use `LOCAL_DASHBOARD_AUTH_BYPASS=true` in `.env.local` (dev only).

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DELTALYTIX_IOS_URL` | Override WebView entry URL (default: production dashboard) |

Set before `cap sync` so `capacitor.config.json` picks up the URL.

---

## Auth & deep links

See **[`docs/auth-deep-links.md`](./docs/auth-deep-links.md)** for:

- Supabase redirect URL configuration (`deltalytix://` + Universal Links)
- Google OAuth / `ASWebAuthenticationSession` pattern
- Magic-link email flow (existing `open-mailbox.ts` iOS handlers)
- Tradovate OAuth callback paths
- Cookie / session persistence in WKWebView

---

## Related

- Desktop WebView shell: `desktop/` on branch `cursor/native-webview-shell-ba62` (PR #292)
- PWA fallback: `public/site.webmanifest` (`display: standalone`)
- Mobile dashboard UI: `app/[locale]/dashboard/` responsive layouts
