# Self-hosting Guide

Agent-focused runbook for local dashboard development. See also [`AGENTS.md`](./AGENTS.md) for copy-paste commands and definition of done.

## 1) Prerequisites

- Docker + Docker Compose (Postgres)
- Bun (`bun --version`)
- Ports `3000` (app) and `5432` (Postgres)

## 2) Quickstart (recommended)

From the repo root:

```bash
bash scripts/self-host-quickstart.sh
bash scripts/dev.sh
```

Open `http://localhost:3000/dashboard`.

The script:
1. starts Postgres with `sudo docker compose up -d db` when needed
2. writes `.env.local` with dashboard bypass vars
3. runs `bun install`, `bunx prisma generate`, `bunx prisma db push`, `bun run seed:self-host`

## 3) Manual bootstrap (dashboard bypass mode)

### Step A: `.env.local`

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

Credentials match `docker-compose.yml` defaults (`devuser` / `devpass`).

### Step B: Postgres in Docker

```bash
sudo docker compose up -d db
sudo docker compose ps
```

If Docker is not running: `bash scripts/docker-bootstrap.sh` (restricted VMs may need `vfs` storage and `--iptables=false`).

### Step C: host setup

```bash
unset DATABASE_URL DIRECT_URL
set -a && source .env.local && set +a
bun install
bunx prisma generate
bunx prisma db push
bun run seed:self-host
bun run dev --hostname 0.0.0.0 --port 3000
```

Or use the wrapper (adds Bun to PATH automatically):

```bash
bash scripts/dev.sh
```

**Schema init:** use `bunx prisma db push` on the host (primary path for agents).

`sudo docker compose run --rm migrate` is optional and only works when the `migrate` container can resolve the `db` hostname (often fails on restricted agent VMs).

### Step D: full Docker app (optional)

`docker-compose.yml` defaults bypass to `false`. To run the production image locally:

```bash
LOCAL_DASHBOARD_AUTH_BYPASS=true NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true sudo docker compose up -d app
```

For dashboard feature work, prefer **Postgres in Docker + app on the host** (`bun run dev`).

## 4) Health checks

```bash
curl -s -o /dev/null -D - http://localhost:3000/dashboard | sed -n '1,10p'
# expect: x-auth-status: authenticated, x-user-id: local-dashboard-user

curl -s -o /dev/null -D - "http://localhost:3000/authentication?next=dashboard" | sed -n '1,8p'
# expect: HTTP/1.1 307, location: /dashboard
```

Build gate:

```bash
OPENAI_API_KEY=dummy bun run build
```

## 5) Visual verification

After seeding, the dashboard should show account `LOCAL-SIM-001` with demo trades.

![Self-hosted dashboard widgets with demo trades](public/img/self-hosting/dashboard-widgets.png)
![Self-hosted dashboard trade table with demo trades](public/img/self-hosting/dashboard-table.png)
![Self-hosted dashboard local simulation account](public/img/self-hosting/dashboard-accounts.png)

Demo video: `public/img/self-hosting/dashboard-demo.mp4`

## 6) Agent pre-deploy checklist

1. `git fetch origin beta && git rebase origin/beta`
2. `bash scripts/self-host-quickstart.sh` (or manual steps above)
3. `OPENAI_API_KEY=dummy bun run build`
4. Dashboard health checks (section 4)
5. Commit, push, open/update PR

## 7) Notes

- Bypass mode is for development/self-host only. Production refuses bypass unless `LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1` is set intentionally.
- Without bypass, configure Supabase vars from `.env.example`.
- `bun run seed:self-host` replaces trades/payouts for the local demo account — dev databases only.
- ATAS import uses `read-excel-file@9.0.10` (do not re-add abandoned npm `xlsx`).
- Cloud/agent shells with a pre-set `DATABASE_URL`: `unset DATABASE_URL DIRECT_URL` before `source .env.local`. At app startup, `lib/load-env-local.ts` also loads `.env.local` with `override: true` so local Docker Postgres wins over injected remote URLs.
