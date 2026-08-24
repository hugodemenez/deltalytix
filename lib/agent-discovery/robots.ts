/**
 * robots.txt policy for Deltalytix.
 *
 * Agent readiness audits resolve each AI user-agent against robots.txt rather
 * than only probing the origin, and a user-agent that matches no explicit group
 * reads as "unknown" (notably `Google-Extended`, which is a robots.txt control
 * token and never sends a request of its own). Every agent we welcome therefore
 * gets its own group.
 *
 * robots.txt groups do not inherit: a crawler that matches a named group
 * ignores the `*` group entirely, so each group repeats the private-area
 * disallows. Keep `DISALLOWED_PATHS` as the single source for them.
 */

/** Private areas that no crawler should index, in every group. */
export const DISALLOWED_PATHS = [
  "/dashboard/",
  "/api/",
  "/authentication/",
] as const;

/**
 * AI crawlers, retrieval agents, and control tokens that are explicitly
 * welcome on the public site.
 */
export const ALLOWED_AGENT_USER_AGENTS = [
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Google
  "Google-Extended",
  "Googlebot",
  "Googlebot-News",
  // Microsoft / Bing
  "bingbot",
  "msnbot",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Apple
  "Applebot",
  "Applebot-Extended",
  // Meta
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  // Amazon
  "Amazonbot",
  // Mistral
  "MistralAI-User",
  // DeepSeek
  "DeepSeekBot",
  // Ora
  "ora-agent",
  // Other retrieval agents
  "YouBot",
  "cohere-ai",
  "Diffbot",
  "DuckAssistBot",
  "PetalBot",
  "Timpibot",
] as const;

/**
 * Content signals (https://contentsignals.org). The declared policy is
 * unchanged from the previous robots.txt: the site opts out of training corpora
 * and stays available to search. Training-corpus-only crawlers (for example
 * CCBot) are therefore deliberately absent from `ALLOWED_AGENT_USER_AGENTS`.
 *
 * Emitted in every group, not only `*`: a crawler that matches a named group
 * ignores `*` entirely, so a signal declared only there would not reach the
 * agents it is aimed at.
 */
export const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=no";

function group(userAgent: string) {
  return [
    `User-agent: ${userAgent}`,
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
  ];
}

export function buildRobotsTxt(origin: string) {
  const url = (path: string) => new URL(path, origin).toString();

  return [
    ...group("*"),
    "",
    "# AI crawlers and retrieval agents are explicitly welcome on public pages.",
    "# robots.txt groups do not inherit, so each group repeats the rules above.",
    ...ALLOWED_AGENT_USER_AGENTS.flatMap((userAgent) => ["", ...group(userAgent)]),
    "",
    `# Machine-readable site index: ${url("/llms.txt")}`,
    `# OpenAPI description: ${url("/openapi.json")}`,
    "",
    `Sitemap: ${url("/sitemap.xml")}`,
    "",
  ].join("\n");
}
