"use server"

import { revalidatePath } from "next/cache"
import { resolveDbUserId } from "@/lib/api/db-user"
import {
  listAuthorizedOAuthAppsForUser,
  listPersonalAccessTokensForUser,
  revokeAuthorizedOAuthAppForUser,
  revokePersonalAccessTokenForUser,
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
