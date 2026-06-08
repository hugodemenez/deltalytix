# Self-hosting Guide

This guide is for running Deltalytix on your own infrastructure with the least friction, especially for automation agents.

It covers:
- local development bootstrap
- dashboard-only mode without Supabase auth (recommended for local work)
- deterministic demo data seeding
- a deploy checklist

## 1) Prerequisites

- Docker + Docker Compose (recommended for Postgres)
- Node.js 20+ and npm
- A free local TCP port for the app (`3000`) and Postgres (`5432`)

### Where demo trades are stored

Use **Docker Postgres** as the default path:

`docker compose up -d db`

This creates a named volume (`deltalytix-postgres`) and exposes Postgres on `localhost:5432`. All seeded trades, accounts, and payouts live in that volume until you run `docker compose down -v`.

Your `.env.local` should point at that instance:

`DATABASE_URL=postgresql://devuser:<password>@localhost:5432/deltalytix_dev`
`DIRECT_URL=postgresql://devuser:<password>@localhost:5432/deltalytix_dev`

Use the same `devuser` / `devpass` credentials defined in `docker-compose.yml` defaults.

If Docker is unavailable, install Postgres on the host instead:

`sudo apt-get install -y postgresql postgresql-client`
`sudo pg_ctlcluster 16 main start`
`sudo -u postgres psql -c "CREATE USER devuser WITH PASSWORD 'devpass' CREATEDB;"`
`sudo -u postgres psql -c "CREATE DATABASE deltalytix_dev OWNER devuser;"`

Prefer Docker when possible so setup matches this guide and the compose file.

### Agent shells with a pre-set `DATABASE_URL`

Some cloud/agent environments inject a remote `DATABASE_URL`. Dotenv does not override existing shell variables. Before seeding or running Prisma against local Docker Postgres, run:

`unset DATABASE_URL DIRECT_URL`
`set -a && source .env.local && set +a`

## 2) Choose your mode

### Recommended for local agent work: Dashboard bypass mode

Use this mode when you want to work on dashboard features without full auth setup.

- No Supabase login required
- Deterministic local user ID/email
- `/dashboard` opens directly
- `/authentication` redirects to `/dashboard`

### Full auth mode (production-like)

Use this only when you need to test OAuth/session behavior. For that, also configure Supabase keys and providers from `.env.example`.

## 3) Local bootstrap (dashboard bypass mode)

### Step A: create your env file

Create `.env.local` with:

`DATABASE_URL=postgresql://devuser:<password>@localhost:5432/deltalytix_dev`
`DIRECT_URL=postgresql://devuser:<password>@localhost:5432/deltalytix_dev`

Use the same `devuser` / `devpass` credentials defined in `docker-compose.yml` defaults.
`LOCAL_DASHBOARD_AUTH_BYPASS=true`
`NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true`
`LOCAL_DASHBOARD_USER_ID=local-dashboard-user`
`NEXT_PUBLIC_LOCAL_DASHBOARD_USER_ID=local-dashboard-user`
`LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local`
`NEXT_PUBLIC_LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local`
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`

Dashboard bypass mode skips Stripe subscription lookups. Billing flows still require real Stripe configuration.

### Step B: start Postgres (Docker)

`docker compose up -d db`

Verify the container is healthy:

`docker compose ps`

If you see `Cannot connect to the Docker daemon`, run the same command with `sudo`.

On restricted VMs, Docker may need `--storage-driver=vfs` and `--iptables=false` when starting `dockerd`. Run `bash scripts/docker-bootstrap.sh` (also wired in `.cursor/environment.json` for cloud agents).

### Docker Compose migrate + app services

Apply migrations non-interactively (after `db` is healthy):

`docker compose run --rm migrate`

`docker-compose.yml` defaults `LOCAL_DASHBOARD_AUTH_BYPASS` to `false`. To use bypass mode in the Docker app service, set both vars explicitly:

`LOCAL_DASHBOARD_AUTH_BYPASS=true NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true docker compose up -d app`

For local dashboard work, the recommended path is **`db` in Docker + app on the host** (`npm run dev`), not the production `app` container.

### Step C: install dependencies

`npm install`

### Step D: generate Prisma client

`npx prisma generate`

### Step E: initialize schema

`DIRECT_URL=postgresql://devuser:<password>@localhost:5432/deltalytix_dev npx prisma db push`

### Step F (optional but recommended): seed deterministic demo data

`unset DATABASE_URL DIRECT_URL`
`set -a && source .env.local && set +a`
`npm run seed:self-host`

This script replaces trades and payouts for the local demo account. Use only against local/dev databases.

This creates:
- local user (`local-dashboard-user`)
- local account (`LOCAL-SIM-001`)
- tick details for ES/MES/NQ/MNQ
- recent trades and payouts for charts/widgets

### Step G: run the app

`npm run dev -- --hostname 0.0.0.0 --port 3000`

Open `http://localhost:3000/dashboard`.

## 4) Quick health checks

These checks are useful for agents before continuing with feature work.

1. Dashboard is accessible:

`curl -s -o /dev/null -D - http://localhost:3000/dashboard | sed -n '1,10p'`

Expected headers include:
- `x-auth-status: authenticated`
- `x-user-id: local-dashboard-user`

2. Auth route redirects:

`curl -s -o /dev/null -D - "http://localhost:3000/authentication?next=dashboard" | sed -n '1,8p'`

Expected:
- `HTTP/1.1 307 Temporary Redirect`
- `location: /dashboard`

## 5) Visual verification

After seeding demo data, verify that the default dashboard renders the local simulation account and recent trades.

The Widgets tab should show the seeded chart layout, including trade distribution, P/L vs commissions, equity, and account selector data for `LOCAL-SIM-001`.

![Self-hosted dashboard widgets with demo trades](public/img/self-hosting/dashboard-widgets.png)

The Table tab should show recent demo trades and pagination.

![Self-hosted dashboard trade table with demo trades](public/img/self-hosting/dashboard-table.png)

The Accounts tab should show the local simulation account, balance, drawdown, consistency, and trading-day metrics.

![Self-hosted dashboard local simulation account](public/img/self-hosting/dashboard-accounts.png)

### Demo walkthrough video

A full dashboard walkthrough (Widgets → Table → Accounts) with seeded `LOCAL-SIM-001` demo trades:

Relative asset path: `public/img/self-hosting/dashboard-demo.mp4`

On GitHub, open the file in the PR branch and use **Download** or the raw view link for the MP4.

## 6) What agents should do before deploy

Use this sequence for reproducible deploy prep:

1. `git fetch origin beta && git rebase origin/beta`
2. `npm install`
3. `DIRECT_URL=... npx prisma db push` (or migrations in your environment)
4. `npm run seed:self-host` (for non-empty local validation)
5. `OPENAI_API_KEY=dummy npm run build` (full build + typecheck)
6. Run targeted checks needed for your changes
7. Run manual dashboard verification on default layout
8. Commit, push, and open/update PR

## 7) Notes

- The local bypass mode is for development/self-host bootstrap. Do not enable it in production; the app refuses bypass when `NODE_ENV=production` unless `LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1` is set intentionally.
- If you disable bypass, you must configure Supabase env vars and auth providers.
- `LOCAL_DASHBOARD_USER_ID` can be changed, but keep it stable per environment so seeded/demo data stays consistent.
