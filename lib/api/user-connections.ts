import { prisma } from "@/lib/prisma"
import {
  generateClientSecret,
  sha256,
} from "@/lib/api/tokens"

export type AuthorizedOAuthAppConnection = {
  appId: string
  name: string
  logoUrl: string | null
  scopes: string[]
  authorizedAt: Date
  lastUsedAt: Date | null
  activeTokenCount: number
}

export type PersonalAccessTokenConnection = {
  id: string
  name: string | null
  scopes: string[]
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

export type OwnedOAuthApp = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  clientId: string
  redirectUris: string[]
  scopes: string[]
  createdAt: Date
  updatedAt: Date
}

function uniqueSortedScopes(scopes: string[]): string[] {
  return [...new Set(scopes)].sort()
}

/**
 * Apps the user has authorized (OAuth grants with an `appId`), grouped by app.
 * Personal access tokens (`appId: null`) are excluded.
 */
export async function listAuthorizedOAuthAppsForUser(
  userId: string,
): Promise<AuthorizedOAuthAppConnection[]> {
  const tokens = await prisma.oAuthAccessToken.findMany({
    where: {
      userId,
      appId: { not: null },
      revokedAt: null,
    },
    select: {
      appId: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      app: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const byApp = new Map<string, AuthorizedOAuthAppConnection>()

  for (const token of tokens) {
    if (!token.appId || !token.app) continue

    const existing = byApp.get(token.appId)
    if (!existing) {
      byApp.set(token.appId, {
        appId: token.appId,
        name: token.app.name,
        logoUrl: token.app.logoUrl,
        scopes: uniqueSortedScopes(token.scopes),
        authorizedAt: token.createdAt,
        lastUsedAt: token.lastUsedAt,
        activeTokenCount: 1,
      })
      continue
    }

    existing.scopes = uniqueSortedScopes([...existing.scopes, ...token.scopes])
    existing.activeTokenCount += 1
    if (token.createdAt < existing.authorizedAt) {
      existing.authorizedAt = token.createdAt
    }
    if (
      token.lastUsedAt &&
      (!existing.lastUsedAt || token.lastUsedAt > existing.lastUsedAt)
    ) {
      existing.lastUsedAt = token.lastUsedAt
    }
  }

  return [...byApp.values()].sort(
    (a, b) => b.authorizedAt.getTime() - a.authorizedAt.getTime(),
  )
}

/**
 * Revoke every active access + refresh token the user issued to `appId`,
 * and drop unused authorization codes for that grant.
 */
export async function revokeAuthorizedOAuthAppForUser(
  userId: string,
  appId: string,
): Promise<{ revokedTokenCount: number }> {
  if (!appId.trim()) {
    return { revokedTokenCount: 0 }
  }

  const revokedAt = new Date()

  const [tokens, codes] = await prisma.$transaction([
    prisma.oAuthAccessToken.updateMany({
      where: {
        userId,
        appId,
        revokedAt: null,
      },
      data: {
        revokedAt,
        // Clear refresh hash so a compromised refresh token cannot be reused
        // even if a future code path forgets the revokedAt check.
        refreshTokenHash: null,
      },
    }),
    prisma.oAuthAuthorizationCode.deleteMany({
      where: {
        userId,
        appId,
        consumedAt: null,
      },
    }),
  ])

  void codes

  return { revokedTokenCount: tokens.count }
}

export async function listPersonalAccessTokensForUser(
  userId: string,
  options?: { includeRevoked?: boolean },
): Promise<PersonalAccessTokenConnection[]> {
  return prisma.oAuthAccessToken.findMany({
    where: {
      userId,
      appId: null,
      ...(options?.includeRevoked ? {} : { revokedAt: null }),
    },
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

export async function revokePersonalAccessTokenForUser(
  userId: string,
  tokenId: string,
): Promise<{ revoked: boolean }> {
  if (!tokenId.trim()) {
    return { revoked: false }
  }

  const result = await prisma.oAuthAccessToken.updateMany({
    where: {
      id: tokenId,
      userId,
      appId: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      refreshTokenHash: null,
    },
  })

  return { revoked: result.count > 0 }
}

export async function listOwnedOAuthAppsForUser(
  userId: string,
): Promise<OwnedOAuthApp[]> {
  return prisma.oAuthApp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      clientId: true,
      redirectUris: true,
      scopes: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Rotate the client secret for an app the user owns.
 * Returns null when the app is missing or owned by someone else.
 */
export async function rotateOAuthAppSecretForUser(
  userId: string,
  appId: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  if (!appId.trim()) {
    return null
  }

  const app = await prisma.oAuthApp.findFirst({
    where: { id: appId, userId },
    select: { id: true, clientId: true },
  })

  if (!app) {
    return null
  }

  const clientSecret = generateClientSecret()
  const updated = await prisma.oAuthApp.updateMany({
    where: { id: app.id, userId },
    data: { clientSecretHash: sha256(clientSecret) },
  })

  if (updated.count === 0) {
    return null
  }

  return { clientId: app.clientId, clientSecret }
}

export async function deleteOwnedOAuthAppForUser(
  userId: string,
  appId: string,
): Promise<{ deleted: boolean }> {
  if (!appId.trim()) {
    return { deleted: false }
  }

  const result = await prisma.oAuthApp.deleteMany({
    where: { id: appId, userId },
  })

  return { deleted: result.count > 0 }
}
