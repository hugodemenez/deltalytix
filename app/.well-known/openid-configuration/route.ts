import { NextRequest, NextResponse } from "next/server";
import {
  getOAuthEndpoint,
  getOAuthIssuer,
} from "@/lib/agent-discovery/metadata";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const issuer = getOAuthIssuer(request);

  return NextResponse.json({
    issuer,
    authorization_endpoint: getOAuthEndpoint("authorize", request),
    token_endpoint: getOAuthEndpoint("token", request),
    jwks_uri: getOAuthEndpoint(".well-known/jwks.json", request),
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "trades:read",
      "journal:read",
      "analytics:read",
    ],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
  });
}
