import { absoluteUrl, getOAuthIssuer } from "@/lib/agent-discovery/metadata";
import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const issuer = getOAuthIssuer(request);

  return NextResponse.json({
    resource: absoluteUrl("/", request),
    authorization_servers: [issuer],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "trades:read",
      "trades:write",
      "journal:read",
      "journal:write",
      "analytics:read",
    ],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/en/support", request),
  });
}
