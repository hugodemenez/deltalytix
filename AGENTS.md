# Codex Instructions

## Project Defaults

- Use Bun for package management and scripts.
- Prefer `bun install --frozen-lockfile` after dependency changes are pulled.
- Prefer `bun run typecheck` and `bun run lint` for broad verification.
- Use `bun test` for unit tests.
- Do not commit or print `.env` values. Configure secrets in the Codex Cloud environment instead.

## PR Review Flow

1. Bootstrap the environment with `bun run codex:setup`.
2. Load a PR locally with `bun run codex:review-pr -- <number>`.
3. Read `codex-pr-context/pr-<number>/summary.json`, `comments.json`, `review-comments.json`, `diff.stat`, and `diff.patch`.
4. Review as a code reviewer first: findings before summary, ordered by severity, with file and line references.
5. If follow-up changes are needed, create a branch on top of the PR head branch and open the follow-up PR against that head branch.
6. After the follow-up PR is approved, merge it into the base PR branch, then re-check the base PR before merge.

## Verification Notes

- If repo-wide verification is blocked by missing external services or env vars, run focused checks for the files touched and clearly report the limitation.
- The app expects browser/public env vars for full local builds. Use Codex Cloud secrets for real values; keep `.env.example` as the committed reference only.
