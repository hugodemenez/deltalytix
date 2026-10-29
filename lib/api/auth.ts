import { prisma } from "@/lib/prisma"
import { hasRequiredScopes } from "@/lib/api/scopes"
import { audienceMatchesRequest } from "@/lib/api/oauth-resource"
import { isAccessTokenExpired, sha256 } from "@/lib/api/tokens"
import {
  insufficientScope,
  unauthorized,
  type UnauthorizedOptions,
} from "@/lib/api/errors"
import { setPublicApiRequestLogContext } from "@/lib/api/request-log"
import { after, type NextResponse } from "next/server"

export type AuthenticatedApiRequest = {
  userId: string
  scopes: string[]
  tokenId: string
  appId: string | null
  clientId: string | null
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
  options?: UnauthorizedOptions,
): Promise<AuthenticateApiResult> {
  const token = extractBearerToken(request)
  if (!token) {
    setPublicApiRequestLogContext({ tokenType: "none" })
    return {
      ok: false,
      response: unauthorized("Missing access token", request, options),
    }
  }

  const tokenHash = sha256(token)
  const record = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash },
    include: { app: { select: { id: true, clientId: true } } },
  })

  if (!record || record.revokedAt) {
    setPublicApiRequestLogContext({ tokenType: "unknown" })
    return {
      ok: false,
      response: unauthorized("Invalid or revoked access token", request, options),
    }
  }

  if (
    record.resource &&
    !audienceMatchesRequest(record.resource, request)
  ) {
    setPublicApiRequestLogContext({
      tokenType: record.appId ? "oauth" : "pat",
      appId: record.appId,
      clientId: record.app?.clientId ?? null,
      userId: record.userId,
    })
    return {
      ok: false,
      response: unauthorized(
        "Access token is not valid for this resource",
        request,
        options,
      ),
    }
  }

  if (isAccessTokenExpired(record)) {
    setPublicApiRequestLogContext({
      tokenType: record.appId ? "oauth" : "pat",
      appId: record.appId,
      clientId: record.app?.clientId ?? null,
      userId: record.userId,
    })
    return {
      ok: false,
      response: unauthorized("Access token has expired", request, options),
    }
  }

  const tokenType = record.appId ? "oauth" : "pat"
  setPublicApiRequestLogContext({
    tokenType,
    appId: record.appId,
    clientId: record.app?.clientId ?? null,
    userId: record.userId,
  })

  if (!hasRequiredScopes(record.scopes, requiredScopes)) {
    return {
      ok: false,
      response: insufficientScope(
        "Token is missing required scopes",
        requiredScopes,
      ),
    }
  }

  after(() =>
    prisma.oAuthAccessToken
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined),
  )

  return {
    ok: true,
    auth: {
      userId: record.userId,
      scopes: record.scopes,
      tokenId: record.id,
      appId: record.appId,
      clientId: record.app?.clientId ?? null,
    },
  }
}
