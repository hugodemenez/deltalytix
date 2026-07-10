# Native SDK iOS path (experimental)

Alternative aligned with the **desktop** Native SDK shell (`desktop/` on PR #292). Not implemented in this spike — documented for comparison and future parity.

## What it is

[Vercel Native SDK](https://github.com/vercel-labs/native) (formerly zero-native) provides:

- `examples/ios` — UIKit host + `WKWebView` + `libnative-sdk.a` (Zig C ABI)
- `native dev --target ios` — simulator workflow (requires Native SDK CLI + Zig)
- Optional `.native` GPU/widget UI instead of pure HTML

## Desktop parity

| Desktop (`desktop/`) | iOS Native SDK |
|----------------------|----------------|
| `zig build run` opens macOS WebView | Xcode scheme runs iOS simulator |
| `DELTALTIX_DESKTOP_URL` env | Would use `DELTALYTIX_IOS_URL` equivalent |
| `allowed_origins` in Zig | Navigation policy in Swift / SDK |
| DMG packaging CI | App Store / TestFlight pipeline (not provided) |

## Build steps (from upstream `examples/ios`)

```bash
# In native-sdk repo — not run in this spike
zig build lib -Dtarget=aarch64-ios
cp zig-out/lib/libnative-sdk.a ios/Libraries/
open examples/ios/NativeSdkIOSExample.xcodeproj
```

Host controller (`NativeSdkHostViewController.swift`):

- UIKit chrome (header, safe area, keyboard insets)
- `WKWebView` workspace
- `native_sdk_app_*` C ABI for commands, viewport, accessibility

## Trade-offs vs Capacitor spike

| | Native SDK iOS | Capacitor |
|--|----------------|-----------|
| Toolchain | Zig + Xcode + Native SDK CLI | Xcode + CocoaPods |
| Maturity | Experimental mobile embedding | Production WebView shells |
| Desktop code reuse | Same Zig runner patterns | Separate from `desktop/` |
| App Store | Unknown / DIY | Common pattern |
| Deep links | Manual UIKit + URL handling | `@capacitor/app` plugins |
| Dashboard UI | Remote URL (same as desktop) | Remote URL |

## Recommendation

**Start with Capacitor** (`ios/capacitor/`). Revisit Native SDK iOS when:

1. Desktop shell ships and team wants one native runtime vendor.
2. Native SDK documents stable `native dev --target ios` for third-party apps.
3. You need SDK-specific features (GPU widgets, unified bridge commands) on mobile.

## Deltalytix integration sketch (future)

```
ios/native-sdk/
├── app.zon              # platforms = .{ "ios" }, web_engine = "system"
├── Libraries/           # libnative-sdk.a (built artifact, gitignored)
├── DeltalytixIOS/       # Xcode project
│   └── DeltalytixHostViewController.swift
└── build.zig            # Thin wrapper loading dashboard URL
```

Default URL: `https://www.deltalytix.app/dashboard` (same as `desktop/src/main.zig`).

Allowed origins should match desktop:

- `https://www.deltalytix.app`
- `http://127.0.0.1:3000` (local dev)
- Supabase / OAuth domains as needed

Auth notes: identical to [`../docs/auth-deep-links.md`](../docs/auth-deep-links.md) — WebView loads hosted app; no native auth rewrite.
