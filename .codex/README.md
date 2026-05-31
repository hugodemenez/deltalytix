# Codex Cloud Environment

Use this repository with a Codex Cloud environment configured for Bun.

## Setup Command

```bash
bun run codex:setup
```

The setup script installs Bun if needed, installs native libraries used by the app's image/PDF dependencies, installs JS dependencies from `bun.lock`, and generates the Prisma client.

## Secrets

Configure real values as Codex Cloud environment secrets. Do not commit them.

Minimum useful review/build secrets mirror `.env.example`:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY`
- `RESEND_API_KEY`
- `GITHUB_TOKEN`

For PR review-only tasks, most app secrets can be absent. Full builds and runtime checks should use the same values as the local Deltalytix `.env`.

## Review A PR

```bash
bun run codex:review-pr -- 132
```

This checks out the PR and writes repeatable review context under `codex-pr-context/pr-132/`.

Use those files before making findings:

- `summary.json`
- `comments.json`
- `review-comments.json`
- `diff.stat`
- `diff.patch`

## Follow-Up PR Pattern

When a review needs code changes:

```bash
git checkout -b <follow-up-branch>
git push -u origin <follow-up-branch>
gh pr create --base <original-pr-head-branch> --head <follow-up-branch>
```

After the follow-up PR is accepted, merge it into the original PR branch, then re-check the original PR before merge.
