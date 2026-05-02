import type { NextRequest } from "next/server";

export const SITE_NAME = "Deltalytix";
export const DEFAULT_ORIGIN = "https://deltalytix.com";

export function getOrigin(request?: NextRequest | Request) {
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }

  return process.env.NEXT_PUBLIC_BASE_URL ?? DEFAULT_ORIGIN;
}

export function absoluteUrl(path: string, request?: NextRequest | Request) {
  return new URL(path, getOrigin(request)).toString();
}

export function getOAuthIssuer(request?: NextRequest | Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl) {
    return new URL("/auth/v1", supabaseUrl).toString().replace(/\/$/, "");
  }

  return absoluteUrl("/auth/v1", request);
}

export function getOAuthEndpoint(path: string, request?: NextRequest | Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl) {
    return new URL(`/auth/v1/${path.replace(/^\//, "")}`, supabaseUrl).toString();
  }

  return absoluteUrl(`/auth/v1/${path.replace(/^\//, "")}`, request);
}

export function linkHeaderValue() {
  return [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
    '</docs/api>; rel="service-doc"',
    '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  ].join(", ");
}

export function homepageMarkdown(request?: NextRequest | Request) {
  const origin = getOrigin(request);

  return `# ${SITE_NAME}

${SITE_NAME} is a trading analytics platform for futures and prop-firm traders.

## Core capabilities

- Connect trading data from supported brokers or import files.
- Visualize performance with dashboards, calendars, charts, and statistics.
- Review trades in detail to spot behavioral and market patterns.
- Journal trades with notes, images, tags, and daily mindset tracking.
- Use AI-assisted imports, analysis summaries, and coaching.
- Collaborate with trading teams and manage shared performance views.

## Agent discovery

- [API catalog](${origin}/.well-known/api-catalog)
- [Agent skills index](${origin}/.well-known/agent-skills/index.json)
- [MCP server card](${origin}/.well-known/mcp/server-card.json)
- [OAuth protected resource metadata](${origin}/.well-known/oauth-protected-resource)
- [OpenID Connect discovery metadata](${origin}/.well-known/openid-configuration)
`;
}

export const deltalytixSkillMarkdown = `# Deltalytix Agent Skill

Use Deltalytix to help traders understand imported trade history, dashboard analytics, journaling data, and AI coaching workflows.

## When to use this skill

- The user wants to discover Deltalytix product capabilities.
- The user needs API, authentication, MCP, or browser tool discovery metadata.
- The user asks how to import trades, review analytics, journal trades, or work with team dashboards.

## Useful resources

- API catalog: /.well-known/api-catalog
- MCP server card: /.well-known/mcp/server-card.json
- OAuth protected resource metadata: /.well-known/oauth-protected-resource
- Homepage markdown: request / with Accept: text/markdown
`;

export const deltalytixSkillDigest =
  "sha256:0aae0fcceca5f11b31a87ead3e091e6ae3157733cd5387b4757f4b74ecefc66c";
