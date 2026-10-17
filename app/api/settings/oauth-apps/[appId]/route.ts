import { NextResponse } from "next/server"
import { resolveDbUserId } from "@/lib/api/db-user"
import {
  badJsonResponse,
  invalidOAuthAppResponse,
  oauthAppNotFoundResponse,
  readOAuthAppInput,
  settingsInternalErrorResponse,
  settingsUnauthorizedResponse,
} from "@/lib/api/settings-oauth-apps-http"
import {
  deleteOwnedOAuthAppForUser,
  getOwnedOAuthAppForUser,
  serializeOwnedOAuthApp,
  updateOwnedOAuthAppForUser,
} from "@/lib/api/user-connections"

type RouteContext = {
  params: Promise<{ appId: string }>
}

async function sessionUserId(): Promise<string | null> {
  try {
    return await resolveDbUserId()
  } catch {
    return null
  }
}

/** One owned app for the Manage panel. */
export async function GET(_request: Request, context: RouteContext) {
  const userId = await sessionUserId()
  if (!userId) return settingsUnauthorizedResponse()
  const { appId } = await context.params

  try {
    const app = await getOwnedOAuthAppForUser(userId, appId)
    if (!app) return oauthAppNotFoundResponse()
    return NextResponse.json(
      { app: serializeOwnedOAuthApp(app) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[settings/oauth-apps/[appId]] GET failed", error)
    return settingsInternalErrorResponse()
  }
}

/**
 * Owner-only partial update of name, description, redirectUris, scopes.
 * Existing grants keep their scopes until the user reconnects.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const userId = await sessionUserId()
  if (!userId) return settingsUnauthorizedResponse()
  const { appId } = await context.params

  const input = await readOAuthAppInput(request)
  if (!input) return badJsonResponse()

  try {
    const result = await updateOwnedOAuthAppForUser(userId, appId, input)
    if (!result.ok) {
      return result.reason === "invalid"
        ? invalidOAuthAppResponse(result.errors)
        : oauthAppNotFoundResponse()
    }
    return NextResponse.json({ app: serializeOwnedOAuthApp(result.data.app) })
  } catch (error) {
    console.error("[settings/oauth-apps/[appId]] PATCH failed", error)
    return settingsInternalErrorResponse()
  }
}

/** Delete an owned app; every connected user loses access immediately. */
export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await sessionUserId()
  if (!userId) return settingsUnauthorizedResponse()
  const { appId } = await context.params

  try {
    const result = await deleteOwnedOAuthAppForUser(userId, appId)
    if (!result.deleted) return oauthAppNotFoundResponse()
    return NextResponse.json({
      deleted: true,
      disconnectedUserCount: result.disconnectedUserCount,
    })
  } catch (error) {
    console.error("[settings/oauth-apps/[appId]] DELETE failed", error)
    return settingsInternalErrorResponse()
  }
}
