import { connection } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import {
  FIRST_PARTY_API_SCOPES,
  getOAuthEndpoint,
  getOAuthIssuer,
  absoluteUrl,
} from "@/lib/agent-discovery/metadata"

export async function GET(request: NextRequest) {
  await connection()

  const issuer = getOAuthIssuer(request)

  return NextResponse.json({
    issuer,
    authorization_endpoint: getOAuthEndpoint("authorize", request),
    token_endpoint: getOAuthEndpoint("token", request),
    revocation_endpoint: getOAuthEndpoint("revoke", request),
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    scopes_supported: [...FIRST_PARTY_API_SCOPES],
    service_documentation: absoluteUrl("/en/docs", request),
  })
}
