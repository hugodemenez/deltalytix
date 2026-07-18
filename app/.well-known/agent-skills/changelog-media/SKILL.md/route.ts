import { changelogMediaSkillMarkdown } from "@/lib/agent-skills/changelog-media";

export function GET() {
  return new Response(changelogMediaSkillMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
