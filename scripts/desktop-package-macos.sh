#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
export PATH="$HOME/.local/zig-0.16:$HOME/.local/zig:$PATH"

cd "$DESKTOP_DIR"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "macOS is required to build a .dmg (uses hdiutil)." >&2
  echo "Use GitHub Actions artifact from the desktop-macos workflow, or run on a Mac." >&2
  exit 1
fi

if ! command -v zig >/dev/null 2>&1; then
  echo "Zig 0.16+ is required. Install from https://ziglang.org/download/0.16.0/" >&2
  exit 1
fi

if [ ! -d node_modules/@native-sdk/cli ]; then
  echo "[desktop] Installing @native-sdk/cli..."
  npm install
fi

if ! command -v native >/dev/null 2>&1; then
  export PATH="$DESKTOP_DIR/node_modules/.bin:$PATH"
fi

node "$ROOT_DIR/scripts/generate-desktop-icon.mjs"

zig build package \
  -Doptimize=ReleaseFast \
  -Dpackage-target=macos \
  -Dpackage-archive=true

echo ""
echo "Artifacts:"
ls -1 zig-out/package/*.dmg zig-out/package/*.app 2>/dev/null || ls -la zig-out/package/
