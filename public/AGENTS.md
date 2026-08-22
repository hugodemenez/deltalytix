# AGENTS.md

## What is Deltalytix?
Deltalytix is a trading analytics platform that helps futures and prop-firm traders
turn raw trade history into clear insights, better habits, and consistent results.

## Who it is for
- Active traders who want to measure performance beyond basic PnL.
- Prop-firm traders managing challenges, rules, and payouts.
- Trading teams who need shared visibility into results.

## What you can do
- Connect trading data from supported brokers or import files.
- Visualize performance with charts, calendars, and statistics.
- Review trades in detail and spot patterns.
- Journal trades with notes, images, tags, and daily mindset tracking.
- Use AI assistance for imports, analysis, and coaching.
- Collaborate in teams and manage member access.

## Core workflow
1. Connect your data (broker sync or file import).
2. Analyze performance in the dashboard and trade table.
3. Reflect in the journal and track daily mindset.
4. Use insights and AI coaching to improve decisions.

## Main areas of the app
- Dashboard: customizable widgets for analytics and charts.
- Trade table: filter, group, and review every trade.
- Calendar: daily and weekly performance overview.
- Journal: structured notes with tags and rich formatting.
- Data management: organize accounts and imports.
- Teams: invite members and view combined performance.
- Billing and settings: manage plan, integrations, and preferences.

## Data sources and imports
- Supported broker syncs: Tradovate and Rithmic.
- File imports: CSV and broker statements (including PDF).
- AI-assisted field mapping to match any broker format.

## AI features
- Trading coach chat for performance insights and pattern analysis.
- Automated analysis summaries and key trend detection.
- Assisted data formatting and import guidance.

## Sharing and collaboration
- Team dashboards for shared analytics.
- Public and embed-friendly views for sharing results.

## Agent entry points
- `/llms.txt`: plain-text index of the site, written for language models.
- `/sitemap.xml`: every public page with last-modified dates.
- `/robots.txt`: crawl policy, with an explicit group for each welcomed AI agent.
- `/openapi.json`: OpenAPI 3.1 description, including security schemes and scopes.
- `/docs/api`: human-readable API documentation.
- `/.well-known/api-catalog`: RFC 9727 linkset.
- `/.well-known/mcp/server-card.json`: Model Context Protocol server card.
- `/.well-known/oauth-protected-resource`: RFC 9728 metadata with the supported scopes.
- `/.well-known/openid-configuration`: OpenID Connect discovery metadata.
- `/.well-known/agent-skills/index.json`: published agent skills with content digests.

Request `/` with `Accept: text/markdown` for a markdown summary of the homepage.
Responses that are content-negotiated send `Vary: Accept, Accept-Encoding`.

## Authentication scopes
Authorize with OAuth 2.0 and request only what the task needs:
`openid`, `profile`, `email`, `trades:read`, `trades:write`, `journal:read`,
`journal:write`, `analytics:read`. Read-only agents should request
`trades:read`, `journal:read`, `analytics:read`.

## Errors
Every `/api/*` failure returns JSON, never HTML:

```json
{ "error": { "code": "not_found", "message": "…", "hint": "…", "status": 404, "documentation_url": "https://deltalytix.app/docs/api" } }
```

Unknown paths return HTTP 404 — the site never answers a missing page with 200.
