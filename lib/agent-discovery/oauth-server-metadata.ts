import type { NextRequest } from "next/server"
import {
  absoluteUrl,
  getOAuthEndpoint,
  getOAuthIssuer,
  scopeNames,
} from "@/lib/agent-discovery/metadata"

/**
 * RFC 8414 authorization-server metadata. Deltalytix is its own authorization
 * server. PKCE S256 is supported. Dynamic client registration is not: every
 * app is a confidential client created by a signed-in user, so this document
 * does not advertise `registration_endpoint`.
 */
export function buildOAuthAuthorizationServerMetadata(
  request?: NextRequest | Request,
) {
  return {
    issuer: getOAuthIssuer(request),
    authorization_endpoint: getOAuthEndpoint("authorize", request),
    token_endpoint: getOAuthEndpoint("token", request),
    revocation_endpoint: getOAuthEndpoint("revoke", request),
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    revocation_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    scopes_supported: scopeNames(),
    service_documentation: absoluteUrl("/docs/api", request),
  }
}
