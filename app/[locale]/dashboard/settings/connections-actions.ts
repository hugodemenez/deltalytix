"use server"

import { revalidatePath } from "next/cache"
import { resolveDbUserId } from "@/lib/api/db-user"
import type {
  OAuthAppFieldError,
  OAuthAppInput,
} from "@/lib/api/oauth-app-input"
import {
  createOwnedOAuthAppForUser,
  deleteOwnedOAuthAppForUser,
  getOwnedOAuthAppForUser,
  listAuthorizedOAuthAppsForUser,
  listOwnedOAuthAppsForUser,
  listPersonalAccessTokensForUser,
  revokeAuthorizedOAuthAppForUser,
  revokePersonalAccessTokenForUser,
  rotateOAuthAppSecretForUser,
  serializeOwnedOAuthApp,
  updateOwnedOAuthAppForUser,
} from "@/lib/api/user-connections"

function revalidateConnectionsSurfaces() {
  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/developers")
}

export async function listAuthorizedOAuthAppsAction() {
  const userId = await resolveDbUserId()
  return listAuthorizedOAuthAppsForUser(userId)
}

export async function revokeAuthorizedOAuthAppAction(appId: string) {
  const userId = await resolveDbUserId()
  const result = await revokeAuthorizedOAuthAppForUser(userId, appId)
  if (result.revokedTokenCount > 0) {
    revalidateConnectionsSurfaces()
  }
  return result
}

export async function listSettingsPersonalAccessTokensAction() {
  const userId = await resolveDbUserId()
  return listPersonalAccessTokensForUser(userId, { includeRevoked: false })
}

export async function revokeSettingsPersonalAccessTokenAction(tokenId: string) {
  const userId = await resolveDbUserId()
  const result = await revokePersonalAccessTokenForUser(userId, tokenId)
  if (result.revoked) {
    revalidateConnectionsSurfaces()
  }
  return result
}

// ---------------------------------------------------------------------------
// Your apps (OAuth apps the session user owns)
//
// These return a discriminated result instead of throwing, because Next.js
// redacts thrown server-action messages in production and the UI needs the
// field-level validation copy.
// ---------------------------------------------------------------------------

export type OwnedOAuthAppDTO = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  clientId: string
  redirectUris: string[]
  scopes: string[]
  createdAt: string
  updatedAt: string
  /** ISO string, or null for older apps: show createdAt instead. */
  secretRotatedAt: string | null
  connectedUserCount: number
}

export type OwnedOAuthAppActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: "invalid"; errors: OAuthAppFieldError[] }
  | { ok: false; code: "not_found"; message: string }

const NOT_FOUND = {
  ok: false as const,
  code: "not_found" as const,
  message: "App not found.",
}

export async function listOwnedOAuthAppsAction(): Promise<OwnedOAuthAppDTO[]> {
  const userId = await resolveDbUserId()
  const apps = await listOwnedOAuthAppsForUser(userId)
  return apps.map(serializeOwnedOAuthApp)
}

export async function getOwnedOAuthAppAction(
  appId: string,
): Promise<OwnedOAuthAppActionResult<{ app: OwnedOAuthAppDTO }>> {
  const userId = await resolveDbUserId()
  const app = await getOwnedOAuthAppForUser(userId, appId)
  if (!app) return NOT_FOUND
  return { ok: true, app: serializeOwnedOAuthApp(app) }
}

export async function createOwnedOAuthAppAction(
  input: OAuthAppInput,
): Promise<
  OwnedOAuthAppActionResult<{ app: OwnedOAuthAppDTO; clientSecret: string }>
> {
  const userId = await resolveDbUserId()
  const result = await createOwnedOAuthAppForUser(userId, input)
  if (!result.ok) {
    return result.reason === "invalid"
      ? { ok: false, code: "invalid", errors: result.errors }
      : NOT_FOUND
  }
  revalidateConnectionsSurfaces()
  return {
    ok: true,
    app: serializeOwnedOAuthApp(result.data.app),
    clientSecret: result.data.clientSecret,
  }
}

export async function updateOwnedOAuthAppAction(
  appId: string,
  input: OAuthAppInput,
): Promise<OwnedOAuthAppActionResult<{ app: OwnedOAuthAppDTO }>> {
  const userId = await resolveDbUserId()
  const result = await updateOwnedOAuthAppForUser(userId, appId, input)
  if (!result.ok) {
    return result.reason === "invalid"
      ? { ok: false, code: "invalid", errors: result.errors }
      : NOT_FOUND
  }
  revalidateConnectionsSurfaces()
  return { ok: true, app: serializeOwnedOAuthApp(result.data.app) }
}

export async function rotateOwnedOAuthAppSecretAction(
  appId: string,
): Promise<
  OwnedOAuthAppActionResult<{
    clientId: string
    clientSecret: string
    secretRotatedAt: string
  }>
> {
  const userId = await resolveDbUserId()
  const result = await rotateOAuthAppSecretForUser(userId, appId)
  if (!result) return NOT_FOUND
  revalidateConnectionsSurfaces()
  return {
    ok: true,
    clientId: result.clientId,
    clientSecret: result.clientSecret,
    secretRotatedAt: result.secretRotatedAt.toISOString(),
  }
}

export async function deleteOwnedOAuthAppAction(
  appId: string,
): Promise<OwnedOAuthAppActionResult<{ disconnectedUserCount: number }>> {
  const userId = await resolveDbUserId()
  const result = await deleteOwnedOAuthAppForUser(userId, appId)
  if (!result.deleted) return NOT_FOUND
  revalidateConnectionsSurfaces()
  return { ok: true, disconnectedUserCount: result.disconnectedUserCount }
}
