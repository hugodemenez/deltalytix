#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "==> Deltalytix Codex Cloud setup"

if ! command -v bun >/dev/null 2>&1; then
  echo "==> Installing Bun"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

if command -v apt-get >/dev/null 2>&1; then
  echo "==> Installing native libraries used by canvas/PDF/image tooling"
  sudo apt-get update
  sudo apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config
fi

echo "==> Installing JS dependencies"
bun install --frozen-lockfile

if [ -f prisma/generated/prisma/client.ts ]; then
  echo "==> Prisma client already present; skipping generation"
else
  echo "==> Generating Prisma client"
  DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/deltalytix}" \
  DIRECT_URL="${DIRECT_URL:-postgresql://postgres:postgres@localhost:5432/deltalytix}" \
    bunx prisma generate
fi

echo "==> Setup complete"
echo "Next: bun run codex:review-pr -- <pr-number>"
