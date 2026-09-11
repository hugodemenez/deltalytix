import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

    if (token && credentials.clientId) {
      const app = await authenticateOAuthClient(credentials, {
        requireSecret: true,
      })
      if (app) {
        const hash = sha256(token)
        await prisma.oAuthAccessToken.updateMany({
          where: {
            appId: app.id,
            OR: [{ tokenHash: hash }, { refreshTokenHash: hash }],
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        })
      }
    }
  } catch (error) {
    console.error("[oauth/revoke]", error)
  }

  return new NextResponse(null, { status: 200 })
}
