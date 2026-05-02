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
- **Next.js dev server**: `npm run dev` (port 3000). Single app, not a monorepo.
- **PostgreSQL 16**: started via `docker compose up db -d` from the repo root. Default creds: `devuser`/`devpass`/`deltalytix_dev`.
- **Prisma 7**: uses `@prisma/adapter-pg` at runtime (`DATABASE_URL`) and `DIRECT_URL` for CLI migrations via `prisma.config.ts`.

### Key commands
| Task | Command |
|---|---|
| Install deps | `npm install` |
| Generate Prisma client | `npx prisma generate` |
| Run migrations | `DIRECT_URL="postgresql://devuser:devpass@localhost:5432/deltalytix_dev" npx prisma migrate dev` |
| Lint | `npm run lint` (ESLint; expect ~400 pre-existing errors) |
| Type-check | `npm run typecheck` (`tsc --noEmit` — should pass clean) |
| Dev server | `npm run dev` |

### Gotchas
- **`prisma.config.ts` uses `dotenv/config`**, which reads `.env` (not `.env.local`). For Prisma CLI commands (`migrate`, `db push`), either create a `.env` with `DIRECT_URL`/`DATABASE_URL`, or pass them as shell env vars explicitly.
- **No lockfile is committed**. `npm install` creates `package-lock.json` locally. Do not commit it.
- **Docker-in-Docker**: the Cloud Agent VM requires `fuse-overlayfs` storage driver and `iptables-legacy` for Docker to work. The update script handles Docker daemon startup.
- **Supabase auth**: without real Supabase keys, the landing page and public routes work, but login/dashboard routes requiring auth will redirect. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` secrets for full auth flow.
- **canvas native module**: `npm install` builds the `canvas` package which needs system libs. These are pre-installed in the Cloud Agent VM. If `canvas` build fails, install `build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev`.
