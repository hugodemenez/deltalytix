#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
export PATH="$HOME/.local/zig-0.16:$HOME/.local/zig:$PATH"

cd "$DESKTOP_DIR"

if ! command -v zig >/dev/null 2>&1; then
  echo "Zig 0.16+ is required. Install from https://ziglang.org/download/0.16.0/" >&2
  exit 1
fi

if ! zig version | grep -q '^0\.16\.'; then
  echo "Zig 0.16+ is required (found: $(zig version))." >&2
  exit 1
fi

if [ ! -d node_modules/@native-sdk/cli ]; then
  echo "[desktop] Installing @native-sdk/cli..."
  npm install
fi

if ! command -v native >/dev/null 2>&1; then
  export PATH="$DESKTOP_DIR/node_modules/.bin:$PATH"
fi

exec zig build dev
