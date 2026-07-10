#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT/ios/capacitor"

if ! command -v bun >/dev/null 2>&1; then
  export PATH="$HOME/.bun/bin:$PATH"
fi

bash "$ROOT/scripts/ios-bootstrap.sh"

# Point the WebView at local Next.js (requires .env.local + Postgres per AGENTS.md).
export DELTALYTIX_IOS_URL="${DELTALYTIX_IOS_URL:-http://127.0.0.1:3000/dashboard}"

echo ""
echo "Starting Next.js dev server in background..."
bash "$ROOT/scripts/dev.sh" &
DEV_PID=$!

cleanup() {
  kill "$DEV_PID" 2>/dev/null || true
}
trap cleanup EXIT

sleep 3

cd "$IOS_DIR"
DELTALYTIX_IOS_URL="$DELTALYTIX_IOS_URL" bunx cap sync ios

echo ""
echo "Local dashboard URL: $DELTALYTIX_IOS_URL"
echo "Open Xcode and run on a simulator:"
echo "  cd ios/capacitor && bun run open"

wait "$DEV_PID"
