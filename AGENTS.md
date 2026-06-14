# AGENTS.md

Operational guide for AI coding agents working in this repository.

## Package manager

Use **Bun** (`bun install`, `bun run dev`, `bun run build`, `bun run seed:self-host`).

## Self-host quickstart (dashboard bypass mode)

Run from the repo root:

```bash
bash scripts/self-host-quickstart.sh
bun run dev --hostname 0.0.0.0 --port 3000
```

Full details: [`SELF_HOSTING.md`](./SELF_HOSTING.md)

## Build and test commands

```bash
bun install
bunx prisma generate
OPENAI_API_KEY=dummy bun run build
bun run typecheck
bun run lint
```

## Local env (dashboard bypass)

Create `.env.local` (or let `scripts/self-host-quickstart.sh` write it):

```env
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
```

If the shell already exports `DATABASE_URL`, run `unset DATABASE_URL DIRECT_URL` before sourcing `.env.local`.

## Definition of done (local dashboard work)

1. `OPENAI_API_KEY=dummy bun run build` passes
2. `bun run seed:self-host` completes without error
3. Dev server running on port `3000`
4. Health checks pass:

```bash
curl -s -o /dev/null -D - http://localhost:3000/dashboard | sed -n '1,10p'
# expect: x-auth-status: authenticated, x-user-id: local-dashboard-user

curl -s -o /dev/null -D - "http://localhost:3000/authentication?next=dashboard" | sed -n '1,8p'
# expect: HTTP/1.1 307, location: /dashboard
```

## Docker notes

- Start Postgres: `sudo docker compose up -d db` (use `sudo` when the daemon requires it)
- Initialize schema on the **host**: `bunx prisma db push` (preferred for agent VMs)
- `sudo docker compose run --rm migrate` only when Compose service DNS works (`db` resolves inside containers)
- Restricted VMs: `bash scripts/docker-bootstrap.sh` before Docker commands

## Security constraints

- **Never** enable `LOCAL_DASHBOARD_AUTH_BYPASS` in production unless `LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1` is set intentionally
- ATAS Excel import uses pinned `read-excel-file@9.0.10`; do **not** re-add the abandoned npm `xlsx` package
- `bun run seed:self-host` is destructive for demo trades/payouts — local/dev databases only

## Before opening a PR

1. `git fetch origin beta && git rebase origin/beta`
2. `bun install`
3. `bunx prisma db push` (with local `.env.local` loaded)
4. `bun run seed:self-host`
5. `OPENAI_API_KEY=dummy bun run build`
6. Run dashboard health checks above
