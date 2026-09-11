import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { oauthError } from "@/lib/api/errors"
import {
  authenticateOAuthClient,
  readOAuthFormOrJson,
  resolveClientCredentials,
} from "@/lib/api/oauth-client"
import {
  ACCESS_TOKEN_TTL_SECONDS,
  accessTokenExpiresAt,
  generateAccessToken,
  generateRefreshToken,
  pkceS256Challenge,
  refreshTokenExpiresAt,
  sha256,
} from "@/lib/api/tokens"

/** Thrown inside the token transaction when another exchange won the race. */
class AuthorizationCodeAlreadyUsed extends Error {}

export async function POST(request: NextRequest) {
  try {
    const body = await readOAuthFormOrJson(request)
    const credentials = resolveClientCredentials(request, body)
    const grantType = body.grant_type

    if (grantType === "authorization_code") {
      const { code, redirect_uri, code_verifier } = body
      if (!code || !redirect_uri || !credentials.clientId) {
        return oauthError(
          400,
          "invalid_request",
          "code, redirect_uri, and client_id are required",
        )
      }

      const app = await authenticateOAuthClient(credentials, {
        requireSecret: false,
      })
      if (!app) {
        return oauthError(401, "invalid_client", "Invalid client credentials")
      }

      const pending = await prisma.oAuthAuthorizationCode.findUnique({
        where: { codeHash: sha256(code) },
      })

      if (
        !pending ||
        pending.appId !== app.id ||
        pending.consumedAt ||
        pending.expiresAt.getTime() <= Date.now() ||
        pending.redirectUri !== redirect_uri
      ) {
        return oauthError(400, "invalid_grant", "Invalid or expired authorization code")
      }

      if (!pending.codeChallenge && !credentials.clientSecret) {
        return oauthError(
          401,
          "invalid_client",
          "client_secret is required for confidential clients without PKCE",
        )
      }

      if (pending.codeChallenge) {
        if (!code_verifier) {
          return oauthError(400, "invalid_grant", "code_verifier is required")
        }
        const method = pending.codeChallengeMethod || "S256"
        if (method !== "S256") {
          return oauthError(400, "invalid_grant", "Unsupported code_challenge_method")
        }
        if (pkceS256Challenge(code_verifier) !== pending.codeChallenge) {
          return oauthError(400, "invalid_grant", "Invalid code_verifier")
        }
      }

      const accessToken = generateAccessToken()
      const refreshToken = generateRefreshToken()
      const scopes = pending.scopes

      // Burn the code and mint the tokens together. `updateMany` filtered on
      // `consumedAt: null` makes the burn a single conditional write, so two
      // concurrent exchanges of one code cannot both pass; the transaction then
      // makes sure a code is never left consumed with no tokens issued.
      try {
        await prisma.$transaction(async (tx) => {
          const consumed = await tx.oAuthAuthorizationCode.updateMany({
            where: { id: pending.id, consumedAt: null },
            data: { consumedAt: new Date() },
          })

          if (consumed.count === 0) {
            throw new AuthorizationCodeAlreadyUsed()
          }

          await tx.oAuthAccessToken.create({
            data: {
              tokenHash: sha256(accessToken),
              refreshTokenHash: sha256(refreshToken),
              appId: app.id,
              userId: pending.userId,
              scopes,
              expiresAt: accessTokenExpiresAt(),
              refreshTokenExpiresAt: refreshTokenExpiresAt(),
            },
          })
        })
      } catch (error) {
        if (error instanceof AuthorizationCodeAlreadyUsed) {
          return oauthError(
            400,
            "invalid_grant",
            "Invalid or expired authorization code",
          )
        }
        throw error
      }

      return NextResponse.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
        scope: scopes.join(" "),
      })
    }

    if (grantType === "refresh_token") {
      const { refresh_token } = body
      if (!refresh_token || !credentials.clientId) {
        return oauthError(
          400,
          "invalid_request",
          "refresh_token and client_id are required",
        )
      }

      const app = await authenticateOAuthClient(credentials, {
        requireSecret: true,
      })
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
