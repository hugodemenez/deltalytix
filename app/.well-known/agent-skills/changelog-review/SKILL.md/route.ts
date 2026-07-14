import { changelogReviewSkillMarkdown } from "@/lib/agent-skills/changelog-review";

export const dynamic = "force-static";

export function GET() {
  return new Response(changelogReviewSkillMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
