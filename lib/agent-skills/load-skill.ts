import fs from "fs";
import path from "path";
import { createHash } from "crypto";

/**
 * Shared agent skills live at the repo root (see `agents/skills/README.md`).
 * `/.well-known/agent-skills/index.json` is a dynamic route, so these files are
 * read inside the serverless function, not only at build time. Resolve them
 * from `process.cwd()` — the same pattern `lib/ai/search-codebase.ts` uses —
 * because `import.meta.url` points at the bundled chunk rather than the source
 * tree, which put the skill markdown out of reach at runtime.
 */
const SKILLS_ROOT = "agents/skills" as const;

/** Keep the markdown in the serverless bundle; see `outputFileTracingIncludes`. */
export const AGENT_SKILLS_TRACE_INCLUDES = [
  `./${SKILLS_ROOT}/*/SKILL.md`,
] as const;

export type LoadedSkill = {
  markdown: string;
  digest: string;
};

export function loadSkill(name: string): LoadedSkill {
  const skillPath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    SKILLS_ROOT,
    name,
    "SKILL.md",
  );
  const markdown = fs.readFileSync(skillPath, "utf8");

  return {
    markdown,
    digest: `sha256:${createHash("sha256").update(markdown).digest("hex")}`,
  };
}
