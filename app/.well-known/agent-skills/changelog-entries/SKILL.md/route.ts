import { changelogEntriesSkillMarkdown } from "@/lib/agent-skills/changelog-entries";

export function GET() {
  return new Response(changelogEntriesSkillMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
