import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api/json-error"
import { resolveDbUserId } from "@/lib/api/db-user"
import { revokePersonalAccessTokenForUser } from "@/lib/api/user-connections"

type RouteContext = {
  params: Promise<{ tokenId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await resolveDbUserId()
    const { tokenId } = await context.params
    const result = await revokePersonalAccessTokenForUser(userId, tokenId)

    if (!result.revoked) {
      return jsonError({
        code: "not_found",
        message: "No active personal access token found.",
        hint: "List tokens with GET /api/settings/oauth-connections and use a token id from that response.",
      })
    }

    return NextResponse.json({ revoked: true })
  } catch (error) {
    console.error("[settings/oauth-connections/tokens] DELETE failed", error)
    return jsonError({
      code: "unauthorized",
      message: "Authentication required to revoke a personal access token.",
      hint: "Sign in to the dashboard, then retry this request with the session cookie.",
    })
  }
}
