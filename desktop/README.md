# Deltalytix Desktop (Native SDK WebView)

Native desktop shell for Deltalytix using [Vercel Native SDK](https://github.com/vercel-labs/native). The shell opens a real OS window with a WebView that loads **https://www.deltalytix.app/dashboard** by default.

## How it works

- **Production (default):** `zig build run` opens a native window pointed at `https://www.deltalytix.app/dashboard`.
- **Dev:** `zig build dev` starts the repo’s local Next.js server and opens `http://127.0.0.1:3000/dashboard` instead.

Deltalytix is server-rendered (`output: "standalone"`), so the shell loads the live web app — no static export bundle.

## App icon

The desktop icon is generated from the same source as the site favicon: [`app/icon.svg`](../app/icon.svg).

```bash
bun run generate:desktop-icon
```

This writes `desktop/assets/icon.png` (1024×1024). `desktop/assets/icon.svg` is a copy of the source SVG for reference.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Zig](https://ziglang.org/download/0.16.0/) | 0.16+ | Required to build the native binary |
| [Bun](https://bun.sh) | latest | Local dev + icon generation |
| Node.js | 18+ | Installs `@native-sdk/cli` in `desktop/` |

**Linux:** `sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev`

**macOS:** Xcode command line tools (system WebKit).

```bash
cd desktop && npm run doctor
```

## Quick start (local dev)

From the repo root (with Postgres + `.env.local` per `AGENTS.md`):

```bash
bash scripts/desktop-dev.sh
```

## Build a macOS `.dmg`

**Requires a Mac** (`hdiutil` is used to create the disk image).

```bash
bash scripts/desktop-package-macos.sh
# or: cd desktop && npm run package:macos-dmg
```

Outputs land in `desktop/zig-out/package/`:

- `deltalytix-desktop-0.1.0-macos-ReleaseFast.app`
- `deltalytix-desktop-0.1.0-macos-ReleaseFast.dmg`

CI builds are **ad-hoc signed** (`codesign --sign -`), not notarized. That is fine for internal testing but macOS Gatekeeper may still block a freshly downloaded copy.

### “App is damaged and can’t be opened”

This usually means **Gatekeeper + download quarantine**, not a corrupt file.

After downloading the artifact from GitHub Actions:

```bash
bash scripts/desktop-unquarantine-macos.sh ~/Downloads/deltalytix-desktop-0.1.0-macos-ReleaseFast.app
```

Or manually:

```bash
xattr -cr /path/to/deltalytix-desktop-0.1.0-macos-ReleaseFast.app
```

Then **right-click → Open** the first time (do not double-click). Public distribution would need Apple Developer signing + notarization (follow-up).

### CI artifact

The [`desktop-macos`](../.github/workflows/desktop-macos.yml) workflow builds the `.dmg` on `macos-latest`. On PRs that touch `desktop/`, download the artifact from the GitHub Actions run.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NATIVE_SDK_FRONTEND_URL` | Set by `zig build dev` to the local dashboard URL |
| `DELTALYTIX_DESKTOP_URL` | Override the loaded URL (default: `https://www.deltalytix.app/dashboard`) |

## Commands

Inside `desktop/`:

```bash
npm run doctor
zig build dev
zig build run
zig build test
zig build package -Doptimize=ReleaseFast -Dpackage-target=macos -Dpackage-archive=true
```

## Auth notes

Production loads the real sign-in flow from deltalytix.app. For local dev, use `LOCAL_DASHBOARD_AUTH_BYPASS=true` in `.env.local` (see `AGENTS.md`).

External links (Stripe, OAuth) open in the system browser.

## Native SDK path

Resolved from `desktop/node_modules/@native-sdk/cli`. Override if needed:

```bash
zig build dev -Dnative-sdk-path=/path/to/native-sdk
```
