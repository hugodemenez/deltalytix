import { prisma } from "@/lib/prisma"
import { hasRequiredScopes } from "@/lib/api/scopes"
import { sha256 } from "@/lib/api/tokens"
import { insufficientScope, unauthorized } from "@/lib/api/errors"
import type { NextResponse } from "next/server"

export type AuthenticatedApiRequest = {
  userId: string
  scopes: string[]
  tokenId: string
}

export type AuthenticateApiResult =
  | { ok: true; auth: AuthenticatedApiRequest }
  | { ok: false; response: NextResponse }

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function authenticateApiRequest(
  request: Request,
  requiredScopes?: string[],
): Promise<AuthenticateApiResult> {
  const token = extractBearerToken(request)
  if (!token) {
    return { ok: false, response: unauthorized("Missing access token", request) }
  }

  const tokenHash = sha256(token)
  const record = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash },
  })

  if (!record || record.revokedAt) {
    return { ok: false, response: unauthorized("Invalid or revoked access token", request) }
  }

  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, response: unauthorized("Access token has expired", request) }
  }

  if (!hasRequiredScopes(record.scopes, requiredScopes)) {
    return {
      ok: false,
      response: insufficientScope(
        "Token is missing required scopes",
        { required: requiredScopes, granted: record.scopes },
      ),
    }
  }

  void prisma.oAuthAccessToken
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined)

  return {
    ok: true,
    auth: {
      userId: record.userId,
      scopes: record.scopes,
      tokenId: record.id,
    },
  }
}
