"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { resolveDbUserId } from "@/lib/api/db-user"
import { API_SCOPES, isValidScope, parseScopes } from "@/lib/api/scopes"
import { generatePersonalAccessToken, sha256 } from "@/lib/api/tokens"
import {
  createOwnedOAuthAppForUser,
  deleteOwnedOAuthAppForUser,
  listOwnedOAuthAppsForUser,
  listPersonalAccessTokensForUser,
  revokePersonalAccessTokenForUser,
  rotateOAuthAppSecretForUser,
} from "@/lib/api/user-connections"

function revalidateDevelopers() {
  revalidatePath("/dashboard/developers")
  revalidatePath("/dashboard/settings")
}

export async function listOAuthAppsAction() {
  const userId = await resolveDbUserId()
  return listOwnedOAuthAppsForUser(userId)
}

export async function createOAuthAppAction(input: {
  name: string
  description?: string
  redirectUris: string[]
  scopes: string[]
}) {
  const userId = await resolveDbUserId()
  const result = await createOwnedOAuthAppForUser(userId, input)
  if (!result.ok) {
    throw new Error(
      result.reason === "invalid"
        ? result.errors.map((e) => e.message).join(" ")
        : "OAuth app not found",
    )
  }

  revalidateDevelopers()
  return {
    id: result.data.app.id,
    clientId: result.data.app.clientId,
    clientSecret: result.data.clientSecret,
  }
}

export async function deleteOAuthAppAction(appId: string) {
  const userId = await resolveDbUserId()
  const result = await deleteOwnedOAuthAppForUser(userId, appId)
  revalidateDevelopers()
  return result
}

export async function rotateOAuthAppSecretAction(appId: string) {
  const userId = await resolveDbUserId()
  const result = await rotateOAuthAppSecretForUser(userId, appId)
  if (!result) {
    throw new Error("OAuth app not found")
  }
  revalidateDevelopers()
  return result
}

export async function listPersonalAccessTokensAction() {
  const userId = await resolveDbUserId()
  return listPersonalAccessTokensForUser(userId, { includeRevoked: true })
}

export async function createPersonalAccessTokenAction(input: {
  name: string
  scopes: string[]
}) {
  const userId = await resolveDbUserId()
  const name = input.name.trim()
  if (!name) throw new Error("Name is required")

  const scopes = input.scopes.filter(isValidScope)
  if (scopes.length === 0) throw new Error("At least one scope is required")

  const token = generatePersonalAccessToken()
  const record = await prisma.oAuthAccessToken.create({
    data: {
      name,
      tokenHash: sha256(token),
      userId,
      scopes,
      appId: null,
      expiresAt: null,
    },
  })

  revalidateDevelopers()
  return { id: record.id, token }
}

export async function revokePersonalAccessTokenAction(tokenId: string) {
  const userId = await resolveDbUserId()
  await revokePersonalAccessTokenForUser(userId, tokenId)
  revalidateDevelopers()
}

export async function getDeveloperApiMetaAction() {
  return {
    scopes: [...API_SCOPES],
    parseScopesHint: parseScopes("profile:read trades:read"),
  }
}
