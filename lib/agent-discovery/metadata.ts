import type { NextRequest } from "next/server";
import { getRequestOrigin, getSiteOrigin } from "@/lib/site-url";
import type { ApiScope } from "@/lib/api/scopes";

export const SITE_NAME = "Deltalytix";

export function getOrigin(request?: NextRequest | Request) {
  if (request) {
    return getRequestOrigin(request.headers);
  }

  return getSiteOrigin();
}

export function absoluteUrl(path: string, request?: NextRequest | Request) {
  return new URL(path, getOrigin(request)).toString();
}

/**
 * Deltalytix is its own authorization server: the issuer is the site origin and
 * the endpoints below are the routes under `app/oauth` and `app/api/oauth`.
 */
export function getOAuthIssuer(request?: NextRequest | Request) {
  return absoluteUrl("/", request).replace(/\/$/, "");
}

const OAUTH_ENDPOINTS: Record<string, string> = {
  authorize: "/oauth/authorize",
  token: "/api/oauth/token",
  revoke: "/api/oauth/revoke",
};

export function getOAuthEndpoint(path: string, request?: NextRequest | Request) {
  const normalized = path.replace(/^\//, "");

  return absoluteUrl(
    OAUTH_ENDPOINTS[normalized] ?? `/api/oauth/${normalized}`,
    request,
  );
}

/**
 * Scopes an agent can request. These are exactly the scopes `lib/api/scopes.ts`
 * validates and the `/api/v1` routes enforce, so the OpenAPI security schemes,
 * the OAuth protected-resource metadata and the OpenID Connect discovery
 * document can never advertise access the authorization server will not grant.
 */
export const AGENT_SCOPES = [
  {
    name: "profile:read",
    description: "Read the signed-in user's profile: id, email, and locale.",
  },
  {
    name: "trades:read",
    description: "Read imported trades, fills, tags, and comments.",
  },
  {
    name: "trades:write",
    description: "Create or import trades on the user's accounts.",
  },
  {
    name: "accounts:read",
    description: "Read the user's trading accounts and their configuration.",
  },
  {
    name: "connections:read",
    description: "Read the user's broker connections and their sync history.",
  },
  {
    name: "connections:write",
    description: "Create broker connections and trigger synchronizations.",
  },
  {
    name: "imports:write",
    description: "Upload trade files and run them through the import pipeline.",
  },
  {
    name: "metrics:read",
    description: "Read computed performance metrics, equity curves, and summaries.",
  },
] as const satisfies readonly { name: ApiScope; description: string }[];

export type AgentScope = (typeof AGENT_SCOPES)[number]["name"];

/** Scope names only, in declaration order. */
export function scopeNames(): AgentScope[] {
  return AGENT_SCOPES.map((scope) => scope.name);
}

/** `{ "trades:read": "Read imported trades..." }` — the OpenAPI/OAuth scope map shape. */
export function scopeMap(): Record<AgentScope, string> {
  return Object.fromEntries(
    AGENT_SCOPES.map((scope) => [scope.name, scope.description]),
  ) as Record<AgentScope, string>;
}

/** Read-only subset advertised as the default for unattended agents. */
export const READ_ONLY_SCOPES: AgentScope[] = [
  "profile:read",
  "trades:read",
  "accounts:read",
  "connections:read",
  "metrics:read",
];

/**
 * Machine-readable entry points, in the order an agent should discover them.
 * Rendered into `/llms.txt`, the homepage markdown, and the 404 markdown body.
 */
export const AGENT_RESOURCES = [
  {
    title: "Sitemap",
    path: "/sitemap.xml",
    description: "Every public page, with last-modified dates.",
  },
  {
    title: "llms.txt",
    path: "/llms.txt",
    description: "Plain-text index of the site written for language models.",
  },
  {
    title: "API documentation",
    path: "/docs/api",
    description: "Human-readable API and agent-integration documentation.",
  },
  {
    title: "OpenAPI description",
    path: "/openapi.json",
    description: "OpenAPI 3.1 document, including security schemes and scopes.",
  },
  {
    title: "API catalog",
    path: "/.well-known/api-catalog",
    description: "RFC 9727 linkset pointing at the API description and status endpoint.",
  },
  {
    title: "Agent skills index",
    path: "/.well-known/agent-skills/index.json",
    description: "Published agent skills with content digests.",
  },
  {
    title: "MCP server card",
    path: "/.well-known/mcp/server-card.json",
    description: "Model Context Protocol server card for browser-exposed tools.",
  },
  {
    title: "OAuth protected resource metadata",
    path: "/.well-known/oauth-protected-resource",
    description: "RFC 9728 metadata listing the authorization server and supported scopes.",
  },
  {
    title: "OpenID Connect discovery",
    path: "/.well-known/openid-configuration",
    description: "Authorization, token, and JWKS endpoints plus supported scopes.",
  },
] as const;

function resourceList(origin: string) {
  return AGENT_RESOURCES.map(
    (resource) =>
      `- [${resource.title}](${new URL(resource.path, origin).toString()}) — ${resource.description}`,
  ).join("\n");
}

/**
 * `Vary` value for any response produced by `Accept` content negotiation.
 * Without it a CDN can hand the cached HTML variant to an agent that asked for
 * markdown (see https://acceptmarkdown.com).
 */
export const CONTENT_NEGOTIATION_VARY = "Accept, Accept-Encoding";

/** True when the client explicitly asked for `text/markdown`. */
export function acceptsMarkdown(accept: string | null | undefined) {
  return Boolean(
    accept
      ?.split(",")
      .some((value) => value.trim().toLowerCase().startsWith("text/markdown")),
  );
}

/**
 * Merge `Accept` into an existing `Vary` header without duplicating tokens or
 * dropping the values Next.js already set (`rsc`, `next-router-state-tree`, …).
 */
export function mergeVary(existing: string | null | undefined, added = CONTENT_NEGOTIATION_VARY) {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of `${existing ?? ""},${added}`.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(trimmed);
  }

  return tokens.join(", ");
}

export function linkHeaderValue() {
  return [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
    '</docs/api>; rel="service-doc"',
    '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
    '</llms.txt>; rel="alternate"; type="text/plain"',
    '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  ].join(", ");
}

export function homepageMarkdown(request?: NextRequest | Request) {
  const origin = getOrigin(request);

  return `# ${SITE_NAME}

${SITE_NAME} is a trading journal for futures and prop-firm traders.

## Core capabilities

- Connect trading data from supported brokers or import files.
- Visualize performance with dashboards, calendars, charts, and statistics.
- Review trades in detail to spot behavioral and market patterns.
- Journal trades with notes, images, tags, and daily mindset tracking.
- Use AI-assisted imports, analysis summaries, and coaching.
- Collaborate with trading teams and manage shared performance views.

## Agent discovery

${resourceList(origin)}

## Authentication

Authorize with OAuth 2.0 and request only the scopes you need: ${scopeNames().join(", ")}.
Read-only agents should request ${READ_ONLY_SCOPES.join(", ")}.
`;
}

/**
 * Markdown body served with a real `404` status so an agent probing for a
 * resource learns the path is missing and where to look instead.
 */
export function notFoundMarkdown(
  pathname?: string,
  request?: NextRequest | Request,
) {
  const origin = getOrigin(request);
  const subject = pathname
    ? `\`${pathname}\` does not exist on ${SITE_NAME}.`
    : `The requested path does not exist on ${SITE_NAME}.`;

  return `# 404 — Not found

${subject}

## Where to look instead

${resourceList(origin)}
`;
}

/** `/llms.txt` body — the llms.txt convention (https://llmstxt.org). */
export function llmsTxt(request?: NextRequest | Request) {
  const origin = getOrigin(request);
  const page = (path: string, title: string, description: string) =>
    `- [${title}](${new URL(path, origin).toString()}): ${description}`;

  return `# ${SITE_NAME}

> ${SITE_NAME} is an open-source trading journal and analytics platform for futures and prop-firm traders. Traders connect a broker or import a file, and Deltalytix turns raw fills into dashboards, a performance calendar, per-trade reviews, journaling, and AI-assisted analysis.

Deltalytix is self-hostable and licensed CC-BY-NC-4.0. Public pages are open to agents; \`/dashboard\`, \`/authentication\` and \`/api\` require an authenticated session or an OAuth access token with the scopes below.

## Product

${page("/", "Home", "Product overview, features, pricing, and FAQ. Request with `Accept: text/markdown` for a markdown summary.")}
${page("/pricing", "Pricing", "Plan comparison and billing terms.")}
${page("/about", "About", "What Deltalytix is and who builds it.")}
${page("/propfirms", "Prop firms", "Catalogue of supported prop firms and funded-account programs.")}
${page("/teams", "Teams", "Shared dashboards and performance reviews for trading teams.")}
${page("/updates", "Changelog", "Release notes for every shipped change.")}
${page("/support", "Support", "Documentation search and contact.")}

## For agents and developers

${resourceList(origin)}

## Authentication and scopes

Deltalytix uses OAuth 2.0. Request the narrowest scope set that covers the task:

${AGENT_SCOPES.map((scope) => `- \`${scope.name}\`: ${scope.description}`).join("\n")}

## Legal

${page("/terms", "Terms of service", "Terms governing use of Deltalytix.")}
${page("/privacy", "Privacy policy", "What data Deltalytix stores and why.")}
${page("/disclaimers", "Disclaimers", "Trading risk disclosures.")}
`;
}

export const deltalytixSkillMarkdown = `# Deltalytix Agent Skill

Use Deltalytix to help traders understand imported trade history, dashboard analytics, journaling data, and AI coaching workflows.

## When to use this skill

- The user wants to discover Deltalytix product capabilities.
- The user needs API, authentication, MCP, or browser tool discovery metadata.
- The user asks how to import trades, review analytics, journal trades, or work with team dashboards.

## Useful resources

- Site index for language models: /llms.txt
- API catalog: /.well-known/api-catalog
- OpenAPI description (security schemes and scopes): /openapi.json
- MCP server card: /.well-known/mcp/server-card.json
- OAuth protected resource metadata: /.well-known/oauth-protected-resource
- Homepage markdown: request / with Accept: text/markdown

## Errors

Every /api/* response uses a JSON error envelope: \`{ "error": { "code", "message", "hint", "status", "documentation_url" } }\`.
Unknown /api/* paths return 404 with that envelope, never HTML.
`;

export const deltalytixSkillDigest =
  "sha256:9fff4eb496cd629f20f7f2dd54b566859e855017ac6537d62a61a4b855dee8a4";
