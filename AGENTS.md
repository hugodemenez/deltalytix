# AGENTS.md

Operational guide for AI coding agents working in this repository.

## Package manager

Use **Bun** (`bun install`, `bun run dev`, `bun run build`, `bun run seed:self-host`).

If `bun: command not found`, either run `export PATH="$HOME/.bun/bin:$PATH"` or use `bash scripts/dev.sh` / `bash scripts/self-host-quickstart.sh` (they install Bun and fix PATH).

## Self-host quickstart (dashboard bypass mode)

Run from the repo root:

```bash
bash scripts/self-host-quickstart.sh
bash scripts/dev.sh
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
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

If the shell already exports `DATABASE_URL`, run `unset DATABASE_URL DIRECT_URL` before sourcing `.env.local`.

At runtime, `lib/load-env-local.node.ts` loads `.env.local` with `override: true` so cloud-injected remote database URLs do not win over local Docker Postgres.

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

## Shared agent skills

The canonical, cross-agent skill library lives in [`agents/skills/`](./agents/skills/). It holds the only copy of each skill; `.claude/skills/` and `.cursor/skills/` contain symlinks into it so Claude Code and Cursor auto-discover the same files. Never copy a skill into an agent-specific tree.

When a task names a skill or matches a skill's frontmatter description:

1. Read that skill's complete `SKILL.md` before acting.
2. Resolve linked resources relative to the skill directory.
3. Use `better-interface` for a holistic interface review; it coordinates the focused `better-accessibility`, `better-colors`, `better-layout`, `better-typography`, `better-ui`, and `better-writing` skills.

See [`agents/skills/README.md`](./agents/skills/README.md) for the catalog and upstream provenance.

## Changelog entries

For beta → main promotion PRs, use three sequential specialist roles. When subagents are available, assign each stage to a separate agent.

Changelog publication is append-only: add new EN/FR entries and media, but never revise an entry already present on the base branch. Use descriptive localized Markdown links for product routes instead of bare paths.

**1. Review changes and draft the outline** — skill: [`agents/skills/changelog-review/SKILL.md`](./agents/skills/changelog-review/SKILL.md)
Discovery: `/.well-known/agent-skills/changelog-review/SKILL.md`
Output: `content/updates/batches/<batch>/outline.md`

**2. Write EN/FR copy** — skill: [`agents/skills/changelog-entries/SKILL.md`](./agents/skills/changelog-entries/SKILL.md)
Discovery: `/.well-known/agent-skills/changelog-entries/SKILL.md`
The copywriter chooses the structure and depth that best fit each entry.

**3. Assess and capture media** — skill: [`agents/skills/changelog-media/SKILL.md`](./agents/skills/changelog-media/SKILL.md)
Discovery: `/.well-known/agent-skills/changelog-media/SKILL.md`
The media specialist decides whether each entry needs zero, one, or several visuals, then records the rationale in `media-plan.md`.

Quick start (media step):

```bash
cp scripts/changelog-media/recipes/template.mjs scripts/changelog-media/recipes/pr-XXX.mjs
# add only assets justified by the media plan, then:
bun run capture:changelog-media -- pr-XXX
```

Assets land in `public/updates/<batch>/{en,fr}/`. If every entry is text-only, skip the recipe and capture step.

## Agent readiness

Public agent-facing surfaces and the constraints that keep them working:

- **Discovery files**: `app/robots.txt`, `app/llms.txt`, `app/sitemap.ts`,
  `app/openapi.json`, and `app/.well-known/*`. Scopes, resource links, and the
  markdown representations all come from `lib/agent-discovery/`; add a scope or
  an entry point there, never inline in a route.
- **API errors**: every `/api/*` failure must use `jsonError()` from
  `lib/api/json-error.ts`. Unmatched `/api/*` paths are answered by
  `app/api/[...not-found]/route.ts`.
- **404s**: unmatched URLs are handled by `app/global-not-found.tsx`
  (`experimental.globalNotFound`), which returns a real 404 status. Do not add a
  catch-all page under `app/[locale]/` — with Cache Components its shell is
  flushed with HTTP 200 before `notFound()` runs, which is a soft 404.
- **Landing copy must server-render**: a `next/dynamic` boundary is a Suspense
  boundary, and with Cache Components only its fallback lands in the prerendered
  shell. Import landing sections statically; keep client-only widgets behind
  `next/dynamic` with `ssr: false` *inside* the section, so a dependency that
  bails out to client-side rendering cannot take the page's HTML with it.
  `app/[locale]/(landing)/landing-ssr-content.test.ts` guards this.
- **Locales**: `lib/locales.ts` is the single list. `proxy.ts` routes on it and
  `next.config.ts` derives the `Vary: Accept` rules from it, so a locale added
  in one place cannot lose content negotiation in the other.

## Docker notes

- Start Postgres: `sudo docker compose up -d db` (use `sudo` when the daemon requires it)
- Initialize schema on the **host**: `bunx prisma db push` (preferred for agent VMs)
- `sudo docker compose run --rm schema-push` only when Compose service DNS works (`db` resolves inside containers)
- Restricted VMs: `bash scripts/docker-bootstrap.sh` before Docker commands

## Security constraints

- **Never** enable `LOCAL_DASHBOARD_AUTH_BYPASS` in production unless `LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1` is set intentionally
- ATAS Excel import uses pinned `read-excel-file@9.0.10`; do **not** re-add the abandoned npm `xlsx` package
- `bun run seed:self-host` is destructive for demo trades/payouts — local/dev databases only

## Before opening a PR

Open PRs against **`beta`** (not `main`). `main` is production; feature work lands on `beta` first.

1. `git fetch origin beta && git rebase origin/beta`
2. `bun install`
3. `bunx prisma db push` (with local `.env.local` loaded)
4. `bun run seed:self-host`
5. `OPENAI_API_KEY=dummy bun run build`
6. Run dashboard health checks above

## Cursor Cloud specific instructions

- **Docker-in-Docker**: Cloud Agent VMs require `fuse-overlayfs` storage driver and `iptables-legacy` for Docker to work. Run `bash scripts/docker-bootstrap.sh` first; if it fails with overlay errors, install `fuse-overlayfs` (`sudo apt-get install -y fuse-overlayfs`) and set `/etc/docker/daemon.json` to `{"storage-driver": "fuse-overlayfs"}` before starting `dockerd`.
- **Full local setup**: Run `bash scripts/self-host-quickstart.sh` then `bash scripts/dev.sh`. This handles Docker Postgres, `.env.local`, Bun install, Prisma, seeding, and dev server startup.
- **Auth**: Uses `LOCAL_DASHBOARD_AUTH_BYPASS=true` — no external Supabase keys needed. The dashboard is accessible at `http://localhost:3000/dashboard` as `local-dashboard-user`.
- **Tailscale (phone / tailnet access)**: `install` runs `scripts/cloud-tailscale-install.sh`; `start` runs `scripts/cloud-tailscale-up.sh` after Docker bootstrap. Add environment secret `TS_AUTHKEY` — a **reusable + ephemeral** Tailscale auth key (admin console → Settings → Keys). Do **not** commit the key. Do **not** enable Funnel. Hostname is `deltalytix-cloud` (override with `TS_HOSTNAME`). After join, open `http://deltalytix-cloud:3000/fr/dashboard` or `http://<node>.<tailnet>.ts.net:3000/fr/dashboard` from any device on the tailnet. Port 3000 is bound on `0.0.0.0` so MagicDNS works without Serve. Anyone on the tailnet is the local dashboard user.
- **PRs target `beta`**, not `main`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->
