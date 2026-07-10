#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT/ios/capacitor"

if ! command -v bun >/dev/null 2>&1; then
  export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required. Install from https://bun.sh or run scripts/self-host-quickstart.sh" >&2
  exit 1
fi

cd "$IOS_DIR"
bun install
bunx cap sync ios

if ! command -v pod >/dev/null 2>&1; then
  echo ""
  echo "CocoaPods not found. Install with: sudo gem install cocoapods"
  echo "Then run: cd ios/capacitor/ios/App && pod install"
  exit 0
fi

cd ios/App
pod install

echo ""
echo "iOS shell ready. Open Xcode with:"
echo "  cd ios/capacitor && bun run open"
