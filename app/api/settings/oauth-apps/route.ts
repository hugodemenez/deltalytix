import { NextResponse } from "next/server"
import { resolveDbUserId } from "@/lib/api/db-user"
import {
  badJsonResponse,
  invalidOAuthAppResponse,
  readOAuthAppInput,
  settingsInternalErrorResponse,
  settingsUnauthorizedResponse,
} from "@/lib/api/settings-oauth-apps-http"
import {
  createOwnedOAuthAppForUser,
  listOwnedOAuthAppsForUser,
  serializeOwnedOAuthApp,
} from "@/lib/api/user-connections"

/** List the OAuth apps the session user owns, with connected-user counts. */
export async function GET() {
  let userId: string
  try {
    userId = await resolveDbUserId()
  } catch {
    return settingsUnauthorizedResponse()
  }

  try {
    const apps = await listOwnedOAuthAppsForUser(userId)
    return NextResponse.json(
      { apps: apps.map(serializeOwnedOAuthApp) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[settings/oauth-apps] GET failed", error)
    return settingsInternalErrorResponse()
  }
}

/** Create an app. The client secret is in this response only. */
export async function POST(request: Request) {
  let userId: string
  try {
    userId = await resolveDbUserId()
  } catch {
    return settingsUnauthorizedResponse()
  }

  const input = await readOAuthAppInput(request)
  if (!input) return badJsonResponse()

  try {
    const result = await createOwnedOAuthAppForUser(userId, input)
    if (!result.ok) {
      return result.reason === "invalid"
        ? invalidOAuthAppResponse(result.errors)
        : settingsInternalErrorResponse()
    }
    return NextResponse.json(
      {
        app: serializeOwnedOAuthApp(result.data.app),
        clientSecret: result.data.clientSecret,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[settings/oauth-apps] POST failed", error)
    return settingsInternalErrorResponse()
  }
}
