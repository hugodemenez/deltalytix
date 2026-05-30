import { deltalytixSkillMarkdown } from "@/lib/agent-discovery/metadata";

export const dynamic = "force-static";

export function GET() {
  return new Response(deltalytixSkillMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
