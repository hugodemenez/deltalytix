import {
  absoluteUrl,
  FIRST_PARTY_API_SCOPES,
  getOAuthIssuer,
} from "@/lib/agent-discovery/metadata"
import { NextRequest, NextResponse } from "next/server"

export function GET(request: NextRequest) {
  const issuer = getOAuthIssuer(request)

  return NextResponse.json({
    resource: absoluteUrl("/", request),
    authorization_servers: [issuer],
    scopes_supported: [...FIRST_PARTY_API_SCOPES],
    bearer_methods_supported: ["header"],
    resource_documentation: absoluteUrl("/en/docs", request),
  })
}
