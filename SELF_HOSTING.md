# Self-hosting Guide

This guide is for running Deltalytix on your own infrastructure with the least friction, especially for automation agents.

It covers:
- local development bootstrap
- dashboard-only mode without Supabase auth (recommended for local work)
- deterministic demo data seeding
- a deploy checklist

## 1) Prerequisites

- Docker + Docker Compose
- Bun (`bun --version`)
- Node.js 20+ (fallback if needed)
- A free local TCP port for the app (`3000`) and Postgres (`5432`)

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

`DATABASE_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev`
`DIRECT_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev`
`LOCAL_DASHBOARD_AUTH_BYPASS=true`
`NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true`
`LOCAL_DASHBOARD_USER_ID=local-dashboard-user`
`NEXT_PUBLIC_LOCAL_DASHBOARD_USER_ID=local-dashboard-user`
`LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local`
`NEXT_PUBLIC_LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local`
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`

### Step B: start Postgres

`docker compose up -d db`

If you see `Cannot connect to the Docker daemon`, run the same command with `sudo`.

### Docker Compose app service

`docker-compose.yml` defaults `LOCAL_DASHBOARD_AUTH_BYPASS` to `false`. To use bypass mode in Docker, set both vars explicitly before starting the app service:

`LOCAL_DASHBOARD_AUTH_BYPASS=true NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true docker compose up -d app`

### Step C: install dependencies

`bun install`

### Step D: generate Prisma client

`npx prisma generate`

### Step E: initialize schema

`DIRECT_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev npx prisma db push`

### Step F (optional but recommended): seed deterministic demo data

`bun run seed:self-host`

This script replaces trades and payouts for the local demo account. Use only against local/dev databases.

This creates:
- local user (`local-dashboard-user`)
- local account (`LOCAL-SIM-001`)
- tick details for ES/MES/NQ/MNQ
- recent trades and payouts for charts/widgets

### Step G: run the app

`bun run dev --hostname 0.0.0.0 --port 3000`

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

## 5) What agents should do before deploy

Use this sequence for reproducible deploy prep:

1. `git fetch origin beta && git rebase origin/beta`
2. `bun install`
3. `DIRECT_URL=... npx prisma db push` (or migrations in your environment)
4. `bun run seed:self-host` (for non-empty local validation)
5. Run targeted checks needed for your changes
6. Run manual dashboard verification on default layout
7. Commit, push, and open/update PR

## 6) Notes

- The local bypass mode is for development/self-host bootstrap. Do not enable it in production; the app refuses bypass when `NODE_ENV=production` unless `LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1` is set intentionally.
- If you disable bypass, you must configure Supabase env vars and auth providers.
- `LOCAL_DASHBOARD_USER_ID` can be changed, but keep it stable per environment so seeded/demo data stays consistent.

