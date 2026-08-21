#!/usr/bin/env bash
# Copy gitignored local env from the main checkout into a new Cursor worktree.
set -u

root="${ROOT_WORKTREE_PATH:-}"
if [[ -z "$root" ]]; then
  echo "[worktree-setup] ROOT_WORKTREE_PATH is unset; skip env copy"
  exit 0
fi

copy_if_needed() {
  local name="$1"
  if [[ -e "$name" ]]; then
    echo "[worktree-setup] $name already present"
    return 0
  fi
  if [[ -f "$root/$name" ]]; then
    cp "$root/$name" "$name"
    echo "[worktree-setup] copied $name from $root"
  else
    echo "[worktree-setup] no $name in $root"
  fi
}

copy_if_needed .env.local
copy_if_needed .env
