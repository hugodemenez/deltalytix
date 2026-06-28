# Codex runbook — EC2 self-host (edit + rebuild)

You are working **on the EC2 server** in `/opt/deltalytix`. This is a **Docker production** deployment, not `bun run dev`.

## Environment

| Item | Value |
|---|---|
| Project root | `/opt/deltalytix` |
| Public URL | `http://13.36.171.174:3000` (IP may change) |
| Dashboard | `http://13.36.171.174:3000/en/dashboard` |
| OS user | `ubuntu` (use `sudo` for docker) |
| Stack | `docker compose` — `deltalytix-db-1` (Postgres 16) + `deltalytix-app-1` (Next.js standalone) |
| Env file | **`.env` only** — do **not** create or restore `.env.local` (breaks Docker DB URLs) |
| Git branch on server | usually `beta` — check with `git branch --show-current` |

## Rules

1. **Edit files under `/opt/deltalytix`** — same repo layout as GitHub (`app/`, `lib/`, `components/`, etc.).
2. **Never enable auth bypass in production** unless explicitly asked; demo server already has bypass in `.env`.
3. **Do not** add the abandoned `xlsx` npm package; ATAS import uses `read-excel-file@9.0.10`.
4. After **any** code change affecting the app image, **rebuild** the `app` service (see below).
5. After **any** `NEXT_PUBLIC_*` change in `.env`, you **must** rebuild — those are baked in at build time.
6. Schema changes: run `schema-push` (Prisma `db push`), not versioned migrations.
7. `bun run seed:self-host` is **destructive** (demo trades/payouts) — only run when asked.

## Standard workflow

```bash
cd /opt/deltalytix

# 1. Optional: sync from GitHub
git fetch origin beta
git status
# git pull origin beta   # only if user wants remote changes

# 2. Edit files (your task)

# 3. Rebuild and restart app (5–15 min)
sudo docker compose up --build -d app

# 4. Watch build/logs if needed
sudo docker compose logs -f app

# 5. Health check (on server)
curl -s -o /dev/null -w "dashboard=%{http_code}\n" http://localhost:3000/en/dashboard
curl -s -I http://localhost:3000/en/dashboard | grep -i x-auth-status

# 6. Container status
sudo docker compose ps
```

Expected health: HTTP **200** on `/en/dashboard`. With auth bypass enabled, response headers include `x-auth-status: authenticated`.

## When to rebuild vs restart only

| Change | Action |
|---|---|
| `.ts`, `.tsx`, `.css`, server code | `sudo docker compose up --build -d app` |
| `NEXT_PUBLIC_*` in `.env` | Edit `.env`, then **rebuild** `app` |
| Server-only env in `.env` (no `NEXT_PUBLIC_`) | `sudo docker compose up -d app` (restart may suffice) |
| `prisma/schema.prisma` | `sudo docker compose run --rm schema-push` then rebuild `app` |
| `docker-compose.yml`, `Dockerfile.bun` | rebuild `app` |

## Database / schema

```bash
cd /opt/deltalytix
sudo docker compose run --rm schema-push
```

Postgres runs in container `deltalytix-db-1`. DB credentials come from `.env` / compose defaults (`devuser` / `deltalytix_dev`).

## Demo auth bypass (already configured)

If dashboard shows login instead of data, verify `.env` contains (demo only):

```env
LOCAL_DASHBOARD_AUTH_BYPASS=true
NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true
LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1
NEXT_PUBLIC_SITE_URL=http://13.36.171.174:3000
```

Then rebuild `app`. Do **not** copy `.env.local` from docs — it points `DATABASE_URL` at `localhost` and breaks Docker.

## Troubleshooting

```bash
# App won't start
sudo docker compose logs app --tail 100

# Port 3000
sudo docker compose ps
curl -v http://localhost:3000/en/dashboard 2>&1 | head -20

# Disk space (builds need several GB)
df -h /

# Clean rebuild (if cache is stale)
sudo docker compose build --no-cache app
sudo docker compose up -d app
```

## What not to do

- Do **not** run `bun run dev` or enable the old `deltalytix.service` systemd unit for production.
- Do **not** commit secrets from `.env` into git.
- Do **not** open PRs from EC2 unless asked — deploy by rebuild on this host.

## Verify from outside (user's browser)

After deploy, user checks: `http://13.36.171.174:3000/en/dashboard`
