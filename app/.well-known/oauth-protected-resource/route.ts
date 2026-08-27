import {
  absoluteUrl,
  AGENT_SCOPES,
  getOAuthIssuer,
  scopeNames,
} from "@/lib/agent-discovery/metadata";
import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const issuer = getOAuthIssuer(request);

  return NextResponse.json({
    resource: absoluteUrl("/", request),
    authorization_servers: [issuer],
    scopes_supported: scopeNames(),
    // Non-standard but widely read by agents deciding which scope to request.
    scope_descriptions: AGENT_SCOPES.map((scope) => ({
      scope: scope.name,
      description: scope.description,
    })),
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/docs/api", request),
    resource_signing_alg_values_supported: ["RS256"],
  });
}
