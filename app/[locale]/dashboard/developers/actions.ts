"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getUserId } from "@/server/auth"
import { API_SCOPES, isValidScope, parseScopes } from "@/lib/api/scopes"
import {
  generateClientId,
  generateClientSecret,
  generatePersonalAccessToken,
  sha256,
} from "@/lib/api/tokens"

function revalidateDevelopers() {
  revalidatePath("/dashboard/developers")
}

export async function listOAuthAppsAction() {
  const userId = await getUserId()
  return prisma.oAuthApp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      clientId: true,
      redirectUris: true,
      scopes: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function createOAuthAppAction(input: {
  name: string
  description?: string
  redirectUris: string[]
  scopes: string[]
}) {
  const userId = await getUserId()
  const name = input.name.trim()
  if (!name) throw new Error("Name is required")

  const redirectUris = input.redirectUris
    .map((u) => u.trim())
    .filter(Boolean)
  if (redirectUris.length === 0) throw new Error("At least one redirect URI is required")

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
  const userId = await getUserId()
  await prisma.oAuthApp.deleteMany({ where: { id: appId, userId } })
  revalidateDevelopers()
}

export async function listPersonalAccessTokensAction() {
  const userId = await getUserId()
  return prisma.oAuthAccessToken.findMany({
    where: { userId, appId: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  })
}

export async function createPersonalAccessTokenAction(input: {
  name: string
  scopes: string[]
}) {
  const userId = await getUserId()
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
  const userId = await getUserId()
  await prisma.oAuthAccessToken.updateMany({
    where: { id: tokenId, userId, appId: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  revalidateDevelopers()
}

export async function getDeveloperApiMetaAction() {
  return {
    scopes: [...API_SCOPES],
    parseScopesHint: parseScopes("profile:read trades:read"),
  }
}
