import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api/json-error"
import { resolveDbUserId } from "@/lib/api/db-user"
import { rotateOAuthAppSecretForUser } from "@/lib/api/user-connections"

type RouteContext = {
  params: Promise<{ appId: string }>
}

/** Rotate the client secret for an OAuth app the session user owns. */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await resolveDbUserId()
    const { appId } = await context.params
    const result = await rotateOAuthAppSecretForUser(userId, appId)

    if (!result) {
      return jsonError({
        code: "not_found",
        message: "OAuth app not found, or you are not its owner.",
        hint: "Only the app owner can rotate secrets. Confirm the appId on /dashboard/developers.",
      })
    }

    return NextResponse.json({
      clientId: result.clientId,
      clientSecret: result.clientSecret,
      secretRotatedAt: result.secretRotatedAt.toISOString(),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[settings/oauth-apps/rotate-secret] POST failed", error)
    return jsonError({
      code: "unauthorized",
      message: "Authentication required to rotate an OAuth client secret.",
      hint: "Sign in to the dashboard, then retry this request with the session cookie.",
    })
  }
}
