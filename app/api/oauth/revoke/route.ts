import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { oauthError } from "@/lib/api/errors"
import { sha256 } from "@/lib/api/tokens"
import {
  authenticateOAuthClient,
  readOAuthFormOrJson,
  resolveClientCredentials,
} from "@/lib/api/oauth-client"

export async function POST(request: NextRequest) {
  try {
    const body = await readOAuthFormOrJson(request)
    const credentials = resolveClientCredentials(request, body)
    const { token } = body

    // RFC 7009: an unknown token is still 200. A confidential client that
    // cannot prove its secret is refused before any revocation runs.
    if (!token) {
      return new NextResponse(null, { status: 200 })
    }

    const app = await authenticateOAuthClient(credentials, {
      requireSecret: true,
    })
    if (!app) {
      return oauthError(401, "invalid_client", "Client authentication failed")
    }

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
    console.error("[oauth/revoke]", error)
    return oauthError(500, "server_error", "Unexpected server error")
  }

  return new NextResponse(null, { status: 200 })
}
