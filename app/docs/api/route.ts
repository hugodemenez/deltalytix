import { NextRequest, NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/agent-discovery/metadata";

export function GET(request: NextRequest) {
  const apiCatalogUrl = absoluteUrl("/.well-known/api-catalog", request);
  const openApiUrl = absoluteUrl("/openapi.json", request);

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Deltalytix API Documentation</title>
  </head>
  <body>
    <main>
      <h1>Deltalytix API Documentation</h1>
      <p>Deltalytix exposes trading analytics, import, journal, and team collaboration APIs for authenticated users.</p>
      <h2>Discovery resources</h2>
      <ul>
        <li><a href="${apiCatalogUrl}">API catalog</a></li>
        <li><a href="${openApiUrl}">OpenAPI description</a></li>
        <li><a href="${absoluteUrl("/api", request)}">Health endpoint</a></li>
      </ul>
      <h2>Authentication</h2>
      <p>Use the <a href="${absoluteUrl("/.well-known/openid-configuration", request)}">OpenID Connect discovery metadata</a> to discover supported OAuth endpoints.</p>
    </main>
  </body>
</html>
`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}
