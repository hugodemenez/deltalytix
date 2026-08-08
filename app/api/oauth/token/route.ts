import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { oauthError } from "@/lib/api/errors"
import {
  ACCESS_TOKEN_TTL_SECONDS,
  accessTokenExpiresAt,
  generateAccessToken,
  generateRefreshToken,
  pkceS256Challenge,
  refreshTokenExpiresAt,
  sha256,
} from "@/lib/api/tokens"

async function readTokenBody(
  request: NextRequest,
): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(json)) {
      if (value != null) out[key] = String(value)
    }
    return out
  }

  const form = await request.formData()
  const out: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value
  })
  return out
}

async function authenticateClient(
  clientId: string | undefined,
  clientSecret: string | undefined,
) {
  if (!clientId) return null
  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app) return null
  if (clientSecret) {
    if (sha256(clientSecret) !== app.clientSecretHash) return null
  }
  return app
}

export async function POST(request: NextRequest) {
  try {
    const body = await readTokenBody(request)
    const grantType = body.grant_type

    if (grantType === "authorization_code") {
      const { code, redirect_uri, client_id, client_secret, code_verifier } = body
      if (!code || !redirect_uri || !client_id) {
        return oauthError(
          400,
          "invalid_request",
          "code, redirect_uri, and client_id are required",
        )
      }

      const app = await authenticateClient(client_id, client_secret)
      if (!app) {
        return oauthError(401, "invalid_client", "Invalid client credentials")
      }

      const authCode = await prisma.oAuthAuthorizationCode.findUnique({
        where: { codeHash: sha256(code) },
      })

      if (
        !authCode ||
        authCode.appId !== app.id ||
        authCode.consumedAt ||
        authCode.expiresAt.getTime() <= Date.now() ||
        authCode.redirectUri !== redirect_uri
      ) {
        return oauthError(400, "invalid_grant", "Invalid or expired authorization code")
      }

      if (authCode.codeChallenge) {
        if (!code_verifier) {
          return oauthError(400, "invalid_grant", "code_verifier is required")
        }
        const method = authCode.codeChallengeMethod || "S256"
        if (method !== "S256") {
          return oauthError(400, "invalid_grant", "Unsupported code_challenge_method")
        }
        if (pkceS256Challenge(code_verifier) !== authCode.codeChallenge) {
          return oauthError(400, "invalid_grant", "Invalid code_verifier")
        }
      } else if (!client_secret) {
        return oauthError(
          401,
          "invalid_client",
          "client_secret is required for confidential clients without PKCE",
        )
      }

      await prisma.oAuthAuthorizationCode.update({
        where: { id: authCode.id },
        data: { consumedAt: new Date() },
      })

      const accessToken = generateAccessToken()
      const refreshToken = generateRefreshToken()
      const scopes = authCode.scopes

      await prisma.oAuthAccessToken.create({
        data: {
          tokenHash: sha256(accessToken),
          refreshTokenHash: sha256(refreshToken),
          appId: app.id,
          userId: authCode.userId,
          scopes,
          expiresAt: accessTokenExpiresAt(),
          refreshTokenExpiresAt: refreshTokenExpiresAt(),
        },
      })

      return NextResponse.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
        scope: scopes.join(" "),
      })
    }

    if (grantType === "refresh_token") {
      const { refresh_token, client_id, client_secret } = body
      if (!refresh_token || !client_id) {
        return oauthError(
          400,
          "invalid_request",
          "refresh_token and client_id are required",
        )
      }

      const app = await authenticateClient(client_id, client_secret)
      if (!app) {
        return oauthError(401, "invalid_client", "Invalid client credentials")
      }

      const existing = await prisma.oAuthAccessToken.findFirst({
        where: {
          refreshTokenHash: sha256(refresh_token),
          appId: app.id,
          revokedAt: null,
        },
      })

      if (
        !existing ||
        !existing.refreshTokenExpiresAt ||
        existing.refreshTokenExpiresAt.getTime() <= Date.now()
      ) {
        return oauthError(400, "invalid_grant", "Invalid or expired refresh token")
      }

      const accessToken = generateAccessToken()
      const refreshToken = generateRefreshToken()

      await prisma.oAuthAccessToken.update({
        where: { id: existing.id },
        data: {
          tokenHash: sha256(accessToken),
          refreshTokenHash: sha256(refreshToken),
          expiresAt: accessTokenExpiresAt(),
          refreshTokenExpiresAt: refreshTokenExpiresAt(),
          lastUsedAt: new Date(),
        },
      })

      return NextResponse.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
        scope: existing.scopes.join(" "),
      })
    }

    return oauthError(400, "unsupported_grant_type", "Unsupported grant_type")
  } catch (error) {
    console.error("[oauth/token]", error)
    return oauthError(500, "server_error", "Unexpected server error")
  }
}
