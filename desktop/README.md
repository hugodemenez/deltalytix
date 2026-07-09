# Deltalytix Desktop (Native SDK WebView)

Native desktop shell for Deltalytix using [Vercel Native SDK](https://github.com/vercel-labs/native). The shell opens a real OS window with a WebView that loads the existing Next.js app — no UI rewrite required.

## How it works

- **Dev:** `zig build dev` starts the repo’s Next.js dev server (`bun run dev` on port 3000) and opens a native window at `http://127.0.0.1:3000/dashboard`.
- **Run:** `zig build run` opens the shell against an already-running server (local or remote via env vars).

Deltalytix is server-rendered (`output: "standalone"`), so this shell loads the live Next.js server rather than bundling static assets.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Zig](https://ziglang.org/download/0.16.0/) | 0.16+ | Required to build the native binary |
| [Bun](https://bun.sh) | latest | Runs the Next.js app (repo root) |
| Node.js | 18+ | Installs `@native-sdk/cli` in `desktop/` |

**Linux:** install WebKitGTK 6 and GTK4 dev packages:

```bash
sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev
```

**macOS:** uses the system WebKit framework (Xcode command line tools).

Run `npm run doctor` inside `desktop/` to verify your environment.

## Quick start

From the **repo root** (with Postgres + `.env.local` set up per `AGENTS.md`):

```bash
bash scripts/desktop-dev.sh
```

Or manually:

```bash
cd desktop
npm install
zig build dev
```

The native window should open on the dashboard. Use the host **View → Reload** menu (or platform shortcut) to refresh the WebView.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NATIVE_SDK_FRONTEND_URL` | Set automatically by `zig build dev`; override to load a different URL |
| `DELTALYTIX_DESKTOP_URL` | Manual override, e.g. `https://your-hosted-deltalytix.com/dashboard` |

Example — point at production while testing the shell locally:

```bash
DELTALYTIX_DESKTOP_URL=https://deltalytix.com/dashboard zig build run
```

## Commands

Inside `desktop/`:

```bash
npm run doctor   # check Zig, WebKit, GTK, etc.
zig build dev    # Next.js dev server + native window
zig build run    # native window only (server must already be running)
zig build test   # Zig unit tests
zig build package -Dpackage-target=linux   # package binary (platform-specific)
```

## Auth notes

Supabase OAuth redirects must allow your local URL (`http://127.0.0.1:3000`). For self-host dev, `LOCAL_DASHBOARD_AUTH_BYPASS=true` in `.env.local` skips sign-in (see `AGENTS.md`).

External links (billing, docs) open in the system browser (`external_links = system_browser` in `app.zon`).

## Limitations (spike)

- No offline mode — requires a running Next.js server.
- Linux uses the software renderer + WebKitGTK; macOS is the best-supported platform.
- App icon in `assets/icon.png` is a placeholder; replace with Deltalytix branding.
- Mobile targets (iOS/Android) are experimental in Native SDK and not configured here.

## Native SDK path

The build resolves the SDK from `desktop/node_modules/@native-sdk/cli`. Override if needed:

```bash
zig build dev -Dnative-sdk-path=/path/to/native-sdk
```
