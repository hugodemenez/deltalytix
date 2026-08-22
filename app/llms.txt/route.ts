import { llmsTxt } from "@/lib/agent-discovery/metadata";

/**
 * `/llms.txt` — the llms.txt convention (https://llmstxt.org): a single
 * plain-text index an agent can read instead of crawling the site.
 */
export function GET(request: Request) {
  return new Response(llmsTxt(request), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
