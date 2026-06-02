# PR 133 Test Findings

Date: 2026-06-01
Branch: `pr-133`
PR: https://github.com/hugodemenez/deltalytix/pull/133

## Goal

Verify that PR 133 lets a local/self-hosted Deltalytix instance run with the dashboard auth bypass, a deterministic local test account, seeded demo trades, and working dashboard visualizations.

## Environment

- Workspace: `/Users/hugodemenez/Documents/Codex/2026-06-01/can-you-test-this-pr-works/deltalytix`
- Bun: `1.3.5`
- Docker: `29.1.5`
- Docker Compose: `v5.1.2`
- Node used by `npx`: `v25.4.0`
- Installed Prisma after `bun install`: `7.8.0`

## Setup Notes

- The workspace started empty, so the repository was cloned and PR 133 was fetched into local branch `pr-133`.
- Created `.env.local` from `SELF_HOSTING.md` with:
  - `DATABASE_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev`
  - `DIRECT_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev`
  - `LOCAL_DASHBOARD_AUTH_BYPASS=true`
  - `NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true`
  - deterministic local user id/email values from the runbook
- Started local Postgres via `docker compose up -d db`.
- Ran `bun install`.

## Findings So Far

### 1. Prisma CLI commands in `SELF_HOSTING.md` do not load `.env.local`

Command:

```sh
npx prisma generate
```

Result:

```text
Failed to load config file ".../deltalytix" as a TypeScript/JavaScript module. Error: PrismaConfigEnvError: Cannot resolve environment variable: DIRECT_URL.
```

Reason:

`prisma.config.ts` imports `dotenv/config`, which loads `.env` by default, not `.env.local`. The runbook instructs users to create `.env.local`, then run `npx prisma generate` and `npx prisma db push` directly.

Workaround used:

```sh
env DATABASE_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev DIRECT_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev npx prisma generate
```

Potential fix:

- Update `prisma.config.ts` to load `.env.local` for local commands, or
- Update `SELF_HOSTING.md` to export env vars / use `dotenv -e .env.local`, or
- Add wrapper scripts for Prisma local setup that load `.env.local`.

### 2. `bun run typecheck` fails because `vitest` is missing

Command:

```sh
bun run typecheck
```

Result:

```text
lib/dxfeed-token.test.ts(1,38): error TS2307: Cannot find module 'vitest' or its corresponding type declarations.
```

Potential fix:

- Add `vitest` as a dev dependency, or
- Exclude test files from `tsconfig.json` typecheck if tests are not intended to be typechecked by the app command.

### 3. Missing lockfile causes dependency drift and generated Prisma churn

`bun install` created a new `bun.lock`. The repo/PR did not include a lockfile.

Observed result:

- `npx prisma generate` resolved Prisma `7.8.0`, while `package.json` uses loose ranges such as `"prisma": "^7.3.0"` and `"@prisma/client": "^7.2.0"`.
- Generated files under `prisma/generated/prisma/**` changed after generation.

Potential fix:

- Commit a lockfile for reproducible local/self-host setup, or
- Pin Prisma package versions exactly if generated client output is checked in.

### 4. `prisma db push` currently fails with `Schema engine error`

Command:

```sh
env DATABASE_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev DIRECT_URL=postgresql://devuser:devpass@localhost:5432/deltalytix_dev npx prisma db push
```

Result:

```text
Datasource "db": PostgreSQL database "deltalytix_dev", schemas "public" at "localhost:5432"
Error: Schema engine error:
```

Notes:

- `docker compose ps db` shows Postgres healthy.
- `docker compose exec db pg_isready -U devuser -d deltalytix_dev` succeeds.
- `npx prisma migrate deploy` fails at the same schema-engine boundary.
- Debug output did not expose a more specific error.
- Next check in progress: retry with `prisma@7.3.0` explicitly to see whether this is Prisma version drift from the missing lockfile.

Follow-up:

```sh
env DATABASE_URL=... DIRECT_URL=... npx prisma@7.3.0 db push
```

Result:

```text
npm error code ENOTFOUND
npm error network request to https://registry.npmjs.org/prisma failed
```

This environment blocks npm registry access unless explicitly approved, so the older-version retry did not run.

### 5. Seed script fails against the existing local Docker volume because the schema is stale

Command:

```sh
env DATABASE_URL=... DIRECT_URL=... LOCAL_DASHBOARD_USER_ID=... LOCAL_DASHBOARD_USER_EMAIL=... bun run seed:self-host
```

First sandboxed run failed with `ECONNREFUSED`; rerunning with permission to connect to local Postgres reached the database.

Result:

```text
Invalid `prisma.payout.createMany()` invocation
The column `propfirmSharingPercentage of relation Payout` does not exist in the current database.
code: "P2022"
```

Interpretation:

- The existing `deltalytix-postgres` Docker volume is from an older local schema.
- Because both `prisma db push` and `prisma migrate deploy` currently fail with `Schema engine error`, the documented setup path cannot update that stale volume in this environment.
- Next approach: start an isolated fresh Compose project on a different port instead of deleting the existing volume.

Fresh DB follow-up:

- `docker compose -p deltalytix-pr133 up -d db` could not be used because `docker-compose.yml` hard-codes `container_name: deltalytix-postgres`, causing a name collision with the existing container.
- Started a separate container instead:

```sh
docker run -d --name deltalytix-pr133-postgres -e POSTGRES_USER=devuser -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=deltalytix_dev -p 55432:5432 postgres:16
```

- `pg_isready` succeeded.
- `prisma db push` against `localhost:55432` still failed with the same generic `Schema engine error`.

Conclusion:

The `prisma db push` failure is independent of the stale existing Docker volume.

### 6. Direct SQL migrations plus seed work on a fresh database

Workaround commands:

```sh
set -e
for f in $(find prisma/migrations -maxdepth 2 -type f -name migration.sql | sort); do
  PGPASSWORD=devpass psql -h localhost -p 55432 -U devuser -d deltalytix_dev -v ON_ERROR_STOP=1 -f "$f"
done
```

Result:

- All checked-in SQL migrations applied cleanly.
- This confirms the migration SQL is valid on fresh Postgres 16.

Seed command:

```sh
env DATABASE_URL=postgresql://devuser:devpass@localhost:55432/deltalytix_dev DIRECT_URL=postgresql://devuser:devpass@localhost:55432/deltalytix_dev LOCAL_DASHBOARD_USER_ID=local-dashboard-user LOCAL_DASHBOARD_USER_EMAIL=local-dashboard@deltalytix.local bun run seed:self-host
```

Result:

```text
[seed-self-host] Ready: user=local-dashboard-user, account=LOCAL-SIM-001, trades=132, days=60
```

Interpretation:

- The seed script can populate demo data once the database schema is present.
- The main setup blocker remains Prisma CLI/schema-engine application of the schema.

### 7. Dashboard health headers pass after seeding, but widgets do not render

With the dev server running against the seeded fresh database:

```sh
curl -s -o /dev/null -D - http://localhost:3000/dashboard
```

Result includes:

```text
HTTP/1.1 200 OK
x-auth-status: authenticated
x-user-email: local-dashboard@deltalytix.local
x-user-id: local-dashboard-user
x-middleware-rewrite: /en/dashboard
```

Auth redirect check:

```sh
curl -s -o /dev/null -D - "http://localhost:3000/authentication?next=dashboard"
```

Result:

```text
HTTP/1.1 307 Temporary Redirect
location: /dashboard
```

Browser-visible dashboard text after accepting cookies:

```text
Import Trades
L
Free
Widgets
Table
Accounts
Edit
Share trades
Add
```

Seeded DB counts:

```text
users=1, accounts=1, trades=132, payouts=2, layouts=1
```

Browser logs show data loading errors:

```text
Error loading data: Error: Neither apiKey nor config.authenticator provided
Error loading Stripe subscription: Error: Neither apiKey nor config.authenticator provided
```

Source:

- `server/stripe.ts` constructs `new Stripe(process.env.STRIPE_SECRET_KEY as string, ...)` at module import time.
- Dashboard data loading imports `getSubscriptionData()` from `server/billing.ts`, which imports `stripe`.

Interpretation:

- Dashboard bypass mode is not fully self-contained. Without `STRIPE_SECRET_KEY`, the dashboard shell loads, but the seeded trades/account/widgets are not visualized.
- `SELF_HOSTING.md` does not mention `STRIPE_SECRET_KEY`, nor does bypass mode mock/skip Stripe subscription loading.

Potential fix:

- In local dashboard bypass mode, skip Stripe subscription loading and return `null`/Free subscription data, or
- Make `server/stripe.ts` lazy-initialize only inside Stripe-dependent operations, or
- Document a dummy `STRIPE_SECRET_KEY` if that is enough for non-billing dashboard pages.

Follow-up with dummy key:

Added this to local `.env.local`:

```sh
STRIPE_SECRET_KEY=sk_test_dummy
```

After Next reloaded env, dashboard widgets rendered successfully. No real Stripe network result was needed for the dashboard widgets in this run.

Server log nuance:

```text
Error fetching subscription: Error: Invalid API Key provided: sk_test_*ummy
type: 'StripeAuthenticationError'
```

That error was caught by `getSubscriptionData()`, and the dashboard still rendered. The dummy key is enough to avoid import-time Stripe construction failure, but it still causes an avoidable Stripe network call in local bypass mode.

Verified rendered dashboard content includes:

- Calendar widget for June 2026
- Trade Distribution: `Winning trades (20/33)`, `Losing trades (13/33)`
- Daily Profit/Loss
- Average P/L by Day
- Average P/L by Hour
- Average Time in Position
- Equity chart with account selector
- Account `LOCAL-SIM-001`
- P/L by Side
- Tick Distribution
- P/L vs Commissions
- Time Range Performance
- Trading Statistics
- Payouts: `$2,050.00`
- Table tab with demo trades and pagination: `33 trades`, `Page 1 of 4`
- Accounts tab with `Local Simulation`, `LOCAL-SIM-001`, balance `$53399.60`, and trading days `36/60`

Important nuance:

- The seed inserted `132` trades, but the Free subscription state only displays recent trades. The visible table/statistics showed `33 trades`.
- This is probably expected app behavior for a Free user, but for a demo/self-host account it may be surprising if the goal is to visualize all seeded demo trades.

## Current Verdict

PR 133 partially works:

- Auth bypass works.
- Local user bootstrap works.
- Seed script works when the schema exists.
- Demo account/trades can render in dashboard widgets, table, and accounts views.

But the documented end-to-end bootstrap does not work cleanly yet:

1. Prisma CLI commands do not load `.env.local`.
2. `prisma db push` / `prisma migrate deploy` fail with generic `Schema engine error` in this environment, while direct SQL migrations work.
3. `bun run typecheck` fails because `vitest` is missing.
4. Missing lockfile allows dependency drift and generated Prisma churn.
5. Dashboard bypass mode still needs `STRIPE_SECRET_KEY` or a Stripe bypass/mock; otherwise dashboard data loading fails and widgets do not render.
6. `docker-compose.yml` hard-codes `container_name`, which blocks running isolated Compose projects side by side.

## 2026-06-02 Follow-up: ATAS Excel Import

User-provided workbook:

```text
/Users/hugodemenez/Downloads/ATAS_statistics_15042026_18052026.xlsx
```

The first dependency-hardening pass replaced vulnerable `xlsx` usage with `exceljs`, but the real ATAS workbook exposed a compatibility issue:

```text
TypeError: Cannot read properties of undefined (reading 'sheets')
    at exceljs/lib/xlsx/xlsx.js:323
```

The workbook itself is a valid `.xlsx` archive with three worksheet XML files:

- `Statistiques`
- `Journal commercial`
- `Transactions`

`read-excel-file@9.0.10` successfully reads the workbook and preserves date/number cell values. The ATAS importer now reads all workbook sheets through the browser entrypoint, selects `Journal` or `Journal commercial`, normalizes hidden Unicode spacing in French headers, and maps the French ATAS journal columns to the expected internal headers.

Validation result against the real workbook:

```json
{
  "sheet": "Journal commercial",
  "rowCount": 46,
  "missing": [],
  "firstTrade": [
    "SWF01206",
    "MESM6@CME",
    "2026-05-06 18:02:50",
    "7345.25",
    "5",
    "2026-05-06 18:06:45",
    "7340",
    "-5",
    "-5.25",
    "-21",
    "-131.25",
    ""
  ]
}
```

Dependency/security verification after the importer swap:

```text
bun install --frozen-lockfile
Checked 1375 installs across 1475 packages (no changes)

bun audit
No vulnerabilities found

bun run typecheck
tsc --noEmit completed successfully
```

Package state:

- `exceljs` is no longer present in `package.json` or `bun.lock`.
- `read-excel-file` is pinned exactly to `9.0.10`.
- The lockfile remains mandatory and reproducible with `bun install --frozen-lockfile`.
