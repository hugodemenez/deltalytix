#!/usr/bin/env bash
# Restore third-party agent skills from skills-lock.json and link them so
# Cursor (`.cursor/skills`) and Claude Code (`.claude/skills`) discover them.
# First-party skills stay in agents/skills/ and are not in the lockfile.
set -euo pipefail
cd "$(dirname "$0")/.."

npx --yes skills experimental_install

link_agent_skills() {
  local dest="$1"
  mkdir -p "$dest"
  local skill name
  for skill in .agents/skills/*; do
    [[ -d "$skill" ]] || continue
    name="$(basename "$skill")"
    ln -sfn "../../.agents/skills/${name}" "${dest}/${name}"
  done
}

if [[ -d .agents/skills ]]; then
  link_agent_skills .cursor/skills
  link_agent_skills .claude/skills
fi
