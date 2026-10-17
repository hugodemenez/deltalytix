import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api/json-error"
import { resolveDbUserId } from "@/lib/api/db-user"
import {
  listAuthorizedOAuthAppsForUser,
  listPersonalAccessTokensForUser,
} from "@/lib/api/user-connections"

/**
 * Session-authenticated view of OAuth apps the user has authorized and their
 * personal access tokens. Used by settings; prefer server actions for mutations.
 */
export async function GET() {
  try {
    const userId = await resolveDbUserId()
    const [authorizedApps, personalAccessTokens] = await Promise.all([
      listAuthorizedOAuthAppsForUser(userId),
      listPersonalAccessTokensForUser(userId, { includeRevoked: false }),
    ])

    return NextResponse.json({
      authorizedApps: authorizedApps.map((app) => ({
        ...app,
        authorizedAt: app.authorizedAt.toISOString(),
        lastUsedAt: app.lastUsedAt?.toISOString() ?? null,
      })),
      personalAccessTokens: personalAccessTokens.map((token) => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
        revokedAt: token.revokedAt?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    console.error("[settings/oauth-connections] GET failed", error)
    return jsonError({
      code: "unauthorized",
      message: "Authentication required to list OAuth connections.",
      hint: "Sign in to the dashboard, then retry this request with the session cookie.",
    })
  }
}
