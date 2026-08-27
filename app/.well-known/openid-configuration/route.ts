import { connection } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import {
  absoluteUrl,
  getOAuthEndpoint,
  getOAuthIssuer,
  scopeNames,
} from "@/lib/agent-discovery/metadata";

export async function GET(request: NextRequest) {
  await connection();

  const issuer = getOAuthIssuer(request);

  return NextResponse.json({
    issuer,
    authorization_endpoint: getOAuthEndpoint("authorize", request),
    token_endpoint: getOAuthEndpoint("token", request),
    revocation_endpoint: getOAuthEndpoint("revoke", request),
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    // Opaque bearer tokens, not signed ID tokens: no `id_token` is ever issued,
    // so the OIDC signing-algorithm claims are deliberately absent.
    subject_types_supported: ["public"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    scopes_supported: scopeNames(),
    service_documentation: absoluteUrl("/docs/api", request),
  });
}
