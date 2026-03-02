# AGENTS.md

## What is Deltalytix?
Deltalytix is a trading analytics platform that helps futures and prop-firm traders
turn raw trade history into clear insights, better habits, and consistent results.

## Who it is for
- Active traders who want to measure performance beyond basic PnL.
- Prop-firm traders managing challenges, rules, and payouts.
- Trading teams who need shared visibility into results.

## What you can do
- Connect trading data from supported brokers or import files.
- Visualize performance with charts, calendars, and statistics.
- Review trades in detail and spot patterns.
- Journal trades with notes, images, tags, and daily mindset tracking.
- Use AI assistance for imports, analysis, and coaching.
- Collaborate in teams and manage member access.

## Core workflow
1. Connect your data (broker sync or file import).
2. Analyze performance in the dashboard and trade table.
3. Reflect in the journal and track daily mindset.
4. Use insights and AI coaching to improve decisions.

## Main areas of the app
- Dashboard: customizable widgets for analytics and charts.
- Trade table: filter, group, and review every trade.
- Calendar: daily and weekly performance overview.
- Journal: structured notes with tags and rich formatting.
- Data management: organize accounts and imports.
- Teams: invite members and view combined performance.
- Billing and settings: manage plan, integrations, and preferences.

## Data sources and imports
- Supported broker syncs: Tradovate and Rithmic.
- File imports: CSV and broker statements (including PDF).
- AI-assisted field mapping to match any broker format.

## AI features
- Trading coach chat for performance insights and pattern analysis.
- Automated analysis summaries and key trend detection.
- Assisted data formatting and import guidance.

## Sharing and collaboration
- Team dashboards for shared analytics.
- Public and embed-friendly views for sharing results.

## Cursor Cloud specific instructions

### Services overview
Single Next.js 16 application (TypeScript, React 19, Tailwind CSS 4, Prisma 7, PostgreSQL 16).
No monorepo — one `package.json` at the repo root.

### Running locally
- **PostgreSQL**: `sudo dockerd &>/dev/null &` then `sudo docker compose up -d db` (uses `docker-compose.yml` at repo root).
- **Database schema**: Set `DIRECT_URL` to the local Docker Postgres URL (see `docker-compose.yml` for credentials), then run `npx prisma db push` (or `prisma migrate dev`).
- **Dev server**: `npm run dev` (port 3000). Requires `.env.local` and `.env` — see `.env.example` for full list.
- Standard commands: `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`), `npm run build`.

### Gotchas
- **`DIRECT_URL` environment variable**: A Supabase-hosted `DIRECT_URL` may be injected as a secret. Prisma CLI (`prisma.config.ts`) uses `dotenv/config` which does **not** override existing env vars. You must pass `DIRECT_URL` explicitly (matching the docker-compose credentials) or `export` it before running any Prisma CLI command to target the local Docker Postgres.
- **`.env` vs `.env.local`**: Next.js reads `.env.local` at runtime, but Prisma CLI reads `.env` via `dotenv/config`. Both files need the correct `DATABASE_URL`/`DIRECT_URL`.
- **Supabase auth** is required for sign-in flows; without real Supabase credentials the landing/public pages work but authenticated routes will not.
- The codebase has ~360 existing ESLint errors (mostly `@typescript-eslint/no-explicit-any`); these are pre-existing and not blocking.
- `npx prisma generate` must run after `npm install` to produce the client at `prisma/generated/prisma`.
