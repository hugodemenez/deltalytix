import { changelogMediaSkillMarkdown } from "@/lib/agent-skills/changelog-media";

export const dynamic = "force-static";

export function GET() {
  return new Response(changelogMediaSkillMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
