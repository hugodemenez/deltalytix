import { NextRequest, NextResponse } from "next/server"
import { oauthError } from "@/lib/api/errors"
import {
  consumeRegistrationAttempt,
  registerOAuthClient,
  registrationClientKey,
  validateClientRegistration,
} from "@/lib/api/oauth-registration"

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" }

/**
 * RFC 7591 dynamic client registration. Unauthenticated. Public clients are
 * the default so Claude, ChatGPT, and Cursor can register with PKCE and no
 * client secret.
 */
export async function POST(request: NextRequest) {
  const allowed = await consumeRegistrationAttempt(registrationClientKey(request))
  if (!allowed) {
    return oauthError(
      429,
      "temporarily_unavailable",
      "Too many client registrations from this address. Try again later.",
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return oauthError(400, "invalid_request", "Request body must be JSON")
  }

  const parsed = validateClientRegistration(body)
  if (!parsed.ok) {
    return oauthError(400, parsed.failure.error, parsed.failure.description)
  }

  try {
    const client = await registerOAuthClient(parsed.value)
    const response: Record<string, unknown> = {
      client_id: client.clientId,
      client_id_issued_at: client.clientIdIssuedAt,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      scope: client.scope.join(" "),
    }
    if (client.clientSecret) {
      response.client_secret = client.clientSecret
      response.client_secret_expires_at = 0
    }
    return NextResponse.json(response, { status: 201, headers: NO_STORE })
  } catch (error) {
    console.error("[oauth/register]", error)
    return oauthError(500, "server_error", "Unexpected server error")
  }
}

export function GET() {
  return oauthError(405, "invalid_request", "Use POST to register a client")
}
