#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/ensure-bun.sh
source "$ROOT_DIR/scripts/ensure-bun.sh"

if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
fi

exec bun run dev --hostname 0.0.0.0 --port 3000 "$@"
