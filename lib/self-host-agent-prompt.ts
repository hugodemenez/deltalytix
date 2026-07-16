import { GITHUB_REPO_URL } from "@/lib/github-repo";

/** English agent prompt — coding agents work best with English instructions. */
export function getSelfHostAgentPrompt(): string {
  return [
    "Set up Deltalytix locally for dashboard development (self-host / local dashboard mode).",
    "",
    `1. Clone ${GITHUB_REPO_URL} (skip if the repo is already checked out).`,
    "2. Read AGENTS.md and SELF_HOSTING.md at the repo root and follow them.",
    "3. From the repo root, run:",
    "   bash scripts/self-host-quickstart.sh",
    "   bash scripts/dev.sh",
    "4. Open http://localhost:3000/dashboard",
    "5. Verify the health checks from AGENTS.md (authenticated dashboard headers and /authentication → /dashboard redirect).",
    "",
    "Requirements: Bun, Docker (Postgres). Local mode supports CSV/PDF import with seeded demo data; live broker sync services remain cloud-only.",
    "Use Bun for install/dev/build. Open PRs against the beta branch.",
  ].join("\n");
}

export function getCursorPromptUrl(prompt: string): string {
  const url = new URL("https://cursor.com/link/prompt");
  url.searchParams.set("text", prompt);
  return url.toString();
}

export function getCodexPromptUrl(prompt: string): string {
  const url = new URL("codex://threads/new");
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("originUrl", GITHUB_REPO_URL);
  return url.toString();
}

export function getClaudePromptUrl(prompt: string): string {
  const url = new URL("https://claude.ai/new");
  url.searchParams.set("q", prompt);
  return url.toString();
}
