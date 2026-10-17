"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { resolveDbUserId } from "@/lib/api/db-user"
import { redirectUriProblem } from "@/lib/api/redirect-uri"
import { API_SCOPES, isValidScope, parseScopes } from "@/lib/api/scopes"
import {
  generateClientId,
  generateClientSecret,
  generatePersonalAccessToken,
  sha256,
} from "@/lib/api/tokens"
import {
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
  const name = input.name.trim()
  if (!name) throw new Error("Name is required")

  const redirectUris = input.redirectUris
    .map((u) => u.trim())
    .filter(Boolean)
  if (redirectUris.length === 0) throw new Error("At least one redirect URI is required")
  for (const uri of redirectUris) {
    const problem = redirectUriProblem(uri)
    if (problem) throw new Error(`Redirect URI ${uri} ${problem}`)
  }

  const scopes = input.scopes.filter(isValidScope)
  if (scopes.length === 0) throw new Error("At least one scope is required")

  const clientId = generateClientId()
  const clientSecret = generateClientSecret()

  const app = await prisma.oAuthApp.create({
    data: {
      userId,
      name,
      description: input.description?.trim() || null,
      clientId,
      clientSecretHash: sha256(clientSecret),
      redirectUris,
      scopes,
    },
  })

  revalidateDevelopers()
  return {
    id: app.id,
    clientId: app.clientId,
    clientSecret,
  }
}

export async function deleteOAuthAppAction(appId: string) {
  const userId = await resolveDbUserId()
  await deleteOwnedOAuthAppForUser(userId, appId)
  revalidateDevelopers()
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
