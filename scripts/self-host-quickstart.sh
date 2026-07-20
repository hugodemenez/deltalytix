#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/ensure-bun.sh
source "$ROOT_DIR/scripts/ensure-bun.sh"

if ! command -v docker >/dev/null 2>&1; then
  echo "[self-host] docker not found. Install Docker or use host Postgres (see SELF_HOSTING.md)."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[self-host] Docker daemon not reachable; trying scripts/docker-bootstrap.sh"
  bash scripts/docker-bootstrap.sh || true
fi

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

if ! "${DOCKER[@]}" info >/dev/null 2>&1; then
  echo "[self-host] Cannot reach Docker. Install/start Docker or use host Postgres (see SELF_HOSTING.md)."
  exit 1
fi

echo "[self-host] Starting Postgres (docker compose up -d db)"
"${DOCKER[@]}" compose up -d db
"${DOCKER[@]}" compose ps

cat > .env.local <<'EOF'
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev # pragma: allowlist secret
DIRECT_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev # pragma: allowlist secret
LOCAL_DASHBOARD_AUTH_BYPASS=true
NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true
LOCAL_DASHBOARD_USER_ID=local-dashboard-user
NEXT_PUBLIC_LOCAL_DASHBOARD_USER_ID=local-dashboard-user
LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local
NEXT_PUBLIC_LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=dummy
# Local AES key for Synchronization.token encryption (dev only — rotate for real deployments)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
EOF

unset DATABASE_URL DIRECT_URL
set -a
# shellcheck disable=SC1091
source .env.local
set +a

echo "[self-host] Installing dependencies"
bun install

echo "[self-host] Generating Prisma client"
bunx prisma generate

echo "[self-host] Pushing schema (host -> localhost:5432)"
bunx prisma db push

echo "[self-host] Seeding demo data"
bun run seed:self-host

echo "[self-host] Ready. Start the app with:"
echo "  bash scripts/dev.sh"
