import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { oauthError } from "@/lib/api/errors"
import { sha256 } from "@/lib/api/tokens"
import {
  authenticateOAuthClient,
  InvalidOAuthRequestBody,
  readOAuthFormOrJson,
  resolveClientCredentials,
} from "@/lib/api/oauth-client"

export async function POST(request: NextRequest) {
  try {
    const body = await readOAuthFormOrJson(request)
    const credentials = resolveClientCredentials(request, body)
    const { token } = body

    const app = await authenticateOAuthClient(credentials)
    if (!app) {
      return oauthError(401, "invalid_client", "Client authentication failed")
    }

    if (!token) {
      return oauthError(400, "invalid_request", "token is required")
    }

    // RFC 7009: a token that is unknown or belongs to another client is still 200.
    const hash = sha256(token)
    await prisma.oAuthAccessToken.updateMany({
      where: {
        appId: app.id,
        OR: [{ tokenHash: hash }, { refreshTokenHash: hash }],
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
  } catch (error) {
    if (error instanceof InvalidOAuthRequestBody) {
      return oauthError(400, "invalid_request", error.message)
    }
    console.error("[oauth/revoke]", error)
    return oauthError(500, "server_error", "Unexpected server error")
  }

  return new NextResponse(null, { status: 200 })
}
