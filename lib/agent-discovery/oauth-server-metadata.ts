import type { NextRequest } from "next/server"
import {
  absoluteUrl,
  getOAuthEndpoint,
  getOAuthIssuer,
  scopeNames,
} from "@/lib/agent-discovery/metadata"

/**
 * RFC 8414 authorization-server metadata. Deltalytix is its own authorization
 * server. Public clients register at `registration_endpoint` and must use
 * PKCE S256. Confidential clients created by a signed-in user still use a
 * client secret. `iss` is returned on authorization responses (RFC 9207) so
 * ChatGPT can use its stable redirect URI.
 */
export function buildOAuthAuthorizationServerMetadata(
  request?: NextRequest | Request,
) {
  return {
    issuer: getOAuthIssuer(request),
    authorization_endpoint: getOAuthEndpoint("authorize", request),
    token_endpoint: getOAuthEndpoint("token", request),
    revocation_endpoint: getOAuthEndpoint("revoke", request),
    registration_endpoint: getOAuthEndpoint("register", request),
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    revocation_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    authorization_response_iss_parameter_supported: true,
    scopes_supported: scopeNames(),
    service_documentation: absoluteUrl("/docs/api", request),
  }
}
