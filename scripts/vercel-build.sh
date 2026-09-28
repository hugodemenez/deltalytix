#!/usr/bin/env bash
# Prisma's Vercel build hook: generate, migrate the shared prod DB on beta/main
# only, then next build. Preview branches must not migrate production.
# https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Vercel sets the bare branch name. Accept refs/heads/* just in case.
git_ref="${VERCEL_GIT_COMMIT_REF:-}"
git_ref="${git_ref#refs/heads/}"

should_migrate() {
  [[ "$git_ref" == "beta" || "$git_ref" == "main" ]]
}

if [[ "${1:-}" == "--plan" ]]; then
  printf 'prisma generate\n'
  if should_migrate; then
    printf 'prisma migrate deploy\n'
  else
    printf 'skip prisma migrate deploy\n'
  fi
  printf 'next build\n'
  exit 0
fi

echo "[vercel-build] VERCEL_GIT_COMMIT_REF=${VERCEL_GIT_COMMIT_REF:-} VERCEL_ENV=${VERCEL_ENV:-}"

echo "[vercel-build] prisma generate"
bunx prisma generate

if should_migrate; then
  echo "[vercel-build] prisma migrate deploy (shared prod DB; branch=${git_ref})"
  if [[ -z "${DIRECT_URL:-}" ]]; then
    echo "[vercel-build] DIRECT_URL is required for migrate deploy on ${git_ref}." >&2
    echo "[vercel-build] Set DIRECT_URL on Vercel Production and the beta deploy environment. Do not set it on Preview PR deploys." >&2
    exit 1
  fi
  bunx prisma migrate deploy
else
  echo "[vercel-build] skip prisma migrate deploy (branch '${git_ref:-unset}' is not beta or main)"
fi

# Keep local `bun run build` unchanged. vercel-build does not trigger `prebuild`,
# so invoke the existing build script (generate-routes + prisma generate + next build).
echo "[vercel-build] bun run build"
bun run build
