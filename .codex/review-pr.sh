#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: bun run codex:review-pr -- <pr-number>"
  exit 2
fi

PR_NUMBER="$1"
ROOT="$(git rev-parse --show-toplevel)"
OUT_DIR="$ROOT/codex-pr-context/pr-$PR_NUMBER"

cd "$ROOT"
mkdir -p "$OUT_DIR"

echo "==> Loading PR #$PR_NUMBER"
gh pr view "$PR_NUMBER" \
  --json number,title,state,url,baseRefName,headRefName,headRefOid,author,mergeable,reviewDecision,statusCheckRollup,files,comments,reviews \
  > "$OUT_DIR/summary.json"

BASE_REF="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('$OUT_DIR/summary.json','utf8')); process.stdout.write(p.baseRefName)")"
HEAD_REF="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('$OUT_DIR/summary.json','utf8')); process.stdout.write(p.headRefName)")"

gh api "repos/:owner/:repo/pulls/$PR_NUMBER/comments" --paginate > "$OUT_DIR/review-comments.json"
gh api "repos/:owner/:repo/issues/$PR_NUMBER/comments" --paginate > "$OUT_DIR/comments.json"

git fetch origin "$BASE_REF"
if ! gh pr checkout "$PR_NUMBER"; then
  REVIEW_BRANCH="codex-review-pr-$PR_NUMBER"
  git fetch origin "pull/$PR_NUMBER/head:$REVIEW_BRANCH"
  git checkout "$REVIEW_BRANCH"
fi

git diff --stat "origin/$BASE_REF"...HEAD > "$OUT_DIR/diff.stat"
git diff --find-renames "origin/$BASE_REF"...HEAD > "$OUT_DIR/diff.patch"

cat > "$OUT_DIR/README.md" <<EOF
# PR $PR_NUMBER Review Context

- Base: $BASE_REF
- Head: $HEAD_REF

Files:
- summary.json: PR metadata, files, status checks, top-level comments/reviews.
- comments.json: issue/PR conversation comments.
- review-comments.json: inline review comments.
- diff.stat: changed-file summary.
- diff.patch: full diff against the base branch.

Recommended review start:

\`\`\`bash
bun run typecheck
bun run lint
\`\`\`
EOF

echo "==> PR #$PR_NUMBER checked out"
echo "Context written to $OUT_DIR"
echo "Base: $BASE_REF"
echo "Head: $HEAD_REF"
