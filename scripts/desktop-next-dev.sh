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
    echo "[desktop] Stopping process(es) on port $port: $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

free_port 3000
rm -f .next/dev/lock 2>/dev/null || true

exec bun run dev --hostname 127.0.0.1 --port 3000
