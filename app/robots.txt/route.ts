import { getOrigin } from "@/lib/agent-discovery/metadata";
import { buildRobotsTxt } from "@/lib/agent-discovery/robots";

export function GET(request: Request) {
  return new Response(buildRobotsTxt(getOrigin(request)), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
