#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/ensure-bun.sh
source "$ROOT_DIR/scripts/ensure-bun.sh"

free_port() {
  local port=$1
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
  fi

  if [ -n "$pids" ]; then
    echo "[dev] Stopping process(es) on port $port: $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 1
  fi
}

free_port 3000

# Next.js dev server lock (stale lock can block startup even when the port is free)
rm -f .next/dev/lock 2>/dev/null || true

exec bun run dev --hostname 0.0.0.0 --port 3000 "$@"
