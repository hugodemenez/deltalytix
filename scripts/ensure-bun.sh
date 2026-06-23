#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "[ensure-bun] Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "[ensure-bun] Bun is not available. Add ~/.bun/bin to PATH or run: source ~/.bashrc"
  exit 1
fi
