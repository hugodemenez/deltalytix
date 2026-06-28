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

## Docker notes

- Start Postgres: `sudo docker compose up -d db` (use `sudo` when the daemon requires it)
- Initialize schema on the **host**: `bunx prisma db push` (preferred for agent VMs)
- `sudo docker compose run --rm schema-push` only when Compose service DNS works (`db` resolves inside containers)
- Restricted VMs: `bash scripts/docker-bootstrap.sh` before Docker commands

## EC2 self-host (SSM — no SSH key)

The demo/production EC2 instance is managed with **AWS Systems Manager Session Manager**. Agents with AWS credentials do **not** need the `.pem` key.

| Setting | Value |
|---|---|
| Instance ID | `i-0343addd1ab65ff12` (override with `EC2_INSTANCE_ID`) |
| App path on server | `/opt/deltalytix` |
| Public URL | `http://13.36.171.174:3000/dashboard` (IP may change without Elastic IP) |
| IAM instance profile | `deltalytix-ec2-ssm-profile` |
| Stack | `sudo docker compose` (Postgres + production app image) |

### Run a remote command (preferred for agents)

```bash
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${AWS_REGION}"

bash scripts/ec2-ssm-exec.sh 'cd /opt/deltalytix && sudo docker compose ps'

# long-running (rebuild)
bash scripts/ec2-ssm-exec.sh --wait 'cd /opt/deltalytix && sudo docker compose up --build -d app'
```

Or use the AWS CLI directly:

```bash
CMD_ID=$(aws ssm send-command \
  --instance-ids i-0343addd1ab65ff12 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["cd /opt/deltalytix && sudo docker compose ps"]' \
  --query Command.CommandId --output text)

aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id i-0343addd1ab65ff12
```

### Interactive shell (optional)

Requires [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) installed locally:

```bash
aws ssm start-session --target i-0343addd1ab65ff12
```

### Deploy after editing on the server

```bash
cd /opt/deltalytix
# edit files, or: git pull origin beta
sudo docker compose up --build -d app
```

Use `.env` for Docker (not `.env.local`). Rebuild after any `NEXT_PUBLIC_*` change.

### Codex CLI on EC2

Install (already run on the demo server; re-run after reprovisioning):

```bash
# From repo checkout on EC2, or pipe script via SSM:
bash scripts/ec2-ssm-exec.sh --wait 'sudo bash -s' < scripts/ec2-codex-setup.sh
```

Or on the server: `sudo bash scripts/ec2-codex-setup.sh`

**Login (you must do this once, interactively):** EC2 has no browser. Use **device code** auth:

1. In ChatGPT → **Settings → Security**, enable **Device code authorization** (workspace admins enable it for the workspace).
2. SSH to the instance as `ubuntu` (SSM SSH config or PEM).
3. Run:

```bash
codex login --device-auth
```

4. Open the printed URL on your laptop/phone, sign in to ChatGPT, enter the one-time code.

**Alternatives:**

- **Copy auth from your laptop** (after `codex login` locally): `scp ~/.codex/auth.json ubuntu@<host>:~/.codex/auth.json`
- **SSH port forward** (browser login): `ssh -L 1455:localhost:1455 deltalytix-ec2` then run `codex login` in that session.
- **API key** (usage-based, not ChatGPT subscription): `printenv OPENAI_API_KEY | codex login --with-api-key`

Verify: `codex login status`

**Codex App remote SSH:** On your laptop, set `[features] remote_connections = true` in `~/.codex/config.toml`, add the EC2 host to `~/.ssh/config`, then **Settings → Connections** → open `/opt/deltalytix`.

Self-host bypass on the demo server requires in `.env`:

```env
LOCAL_DASHBOARD_AUTH_BYPASS=true
NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS=true
LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1
```

### Health check from outside

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://13.36.171.174:3000/en/dashboard
# expect: 200
```

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
