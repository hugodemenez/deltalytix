#!/usr/bin/env bash
# Remove macOS quarantine after downloading the CI .dmg / .app from GitHub.
# Gatekeeper often reports unsigned downloads as "damaged" — this is not file corruption.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is for macOS only." >&2
  exit 1
fi

TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  cat >&2 <<'EOF'
Usage: bash scripts/desktop-unquarantine-macos.sh <path-to.app-or-.dmg>

Examples:
  bash scripts/desktop-unquarantine-macos.sh ~/Downloads/deltalytix-desktop-0.1.0-macos-ReleaseFast.app
  bash scripts/desktop-unquarantine-macos.sh ~/Downloads/deltalytix-desktop-0.1.0-macos-ReleaseFast.dmg

Then open the .app (right-click → Open on first launch if macOS still warns).
EOF
  exit 1
fi

if [[ ! -e "$TARGET" ]]; then
  echo "Not found: $TARGET" >&2
  exit 1
fi

xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true
xattr -cr "$TARGET"

echo "Removed quarantine attributes from: $TARGET"
echo "If macOS still blocks launch: right-click the .app → Open (first time only)."
