import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api/json-error"
import { resolveDbUserId } from "@/lib/api/db-user"
import { revokeAuthorizedOAuthAppForUser } from "@/lib/api/user-connections"

type RouteContext = {
  params: Promise<{ appId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await resolveDbUserId()
    const { appId } = await context.params
    const result = await revokeAuthorizedOAuthAppForUser(userId, appId)

    if (result.revokedTokenCount === 0) {
      return jsonError({
        code: "not_found",
        message: "No active authorization found for this app.",
        hint: "List connections with GET /api/settings/oauth-connections and use an appId from that response.",
      })
    }

    return NextResponse.json({
      revoked: true,
      revokedTokenCount: result.revokedTokenCount,
    })
  } catch (error) {
    console.error("[settings/oauth-connections/apps] DELETE failed", error)
    return jsonError({
      code: "unauthorized",
      message: "Authentication required to revoke an OAuth connection.",
      hint: "Sign in to the dashboard, then retry this request with the session cookie.",
    })
  }
}
