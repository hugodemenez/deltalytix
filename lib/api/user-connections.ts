import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/prisma/generated/prisma/client"
import {
  generateClientId,
  generateClientSecret,
  sha256,
} from "@/lib/api/tokens"
import {
  validateOAuthAppInput,
  type OAuthAppFieldError,
  type OAuthAppInput,
} from "@/lib/api/oauth-app-input"

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
  /** Null for apps created before the column existed: fall back to createdAt. */
  secretRotatedAt: Date | null
  /** Distinct users holding an active (non-revoked, usable) grant to this app. */
  connectedUserCount: number
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

const OWNED_APP_SELECT = {
  id: true,
  name: true,
  description: true,
  logoUrl: true,
  clientId: true,
  redirectUris: true,
  scopes: true,
  createdAt: true,
  updatedAt: true,
  secretRotatedAt: true,
} as const

/**
 * A grant is "active" while it is not revoked and can still be used: either
 * the access token has not expired (or never expires), or a live refresh token
 * can mint a new one.
 */
export function activeGrantWhere(now: Date = new Date()): Prisma.OAuthAccessTokenWhereInput {
  return {
    revokedAt: null,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
      {
        refreshTokenHash: { not: null },
        OR: [
          { refreshTokenExpiresAt: null },
          { refreshTokenExpiresAt: { gt: now } },
        ],
      },
    ],
  }
}

/**
 * Number of distinct users with an active grant, per app id. Apps with no
 * active grant are present with 0.
 */
export async function countConnectedUsersByApp(
  appIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(appIds.map((id) => [id, 0]))
  if (appIds.length === 0) return counts

  const rows = await prisma.oAuthAccessToken.findMany({
    where: { appId: { in: appIds }, ...activeGrantWhere() },
    select: { appId: true, userId: true },
    distinct: ["appId", "userId"],
  })

  const seen = new Set<string>()
  for (const row of rows) {
    if (!row.appId) continue
    const key = `${row.appId}\u0000${row.userId}`
    if (seen.has(key)) continue
    seen.add(key)
    counts.set(row.appId, (counts.get(row.appId) ?? 0) + 1)
  }
  return counts
}

export async function listOwnedOAuthAppsForUser(
  userId: string,
): Promise<OwnedOAuthApp[]> {
  const apps = await prisma.oAuthApp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: OWNED_APP_SELECT,
  })
  const counts = await countConnectedUsersByApp(apps.map((app) => app.id))
  return apps.map((app) => ({
    ...app,
    connectedUserCount: counts.get(app.id) ?? 0,
  }))
}

/** One owned app (for the Manage panel). Null when missing or not the owner. */
export async function getOwnedOAuthAppForUser(
  userId: string,
  appId: string,
): Promise<OwnedOAuthApp | null> {
  if (!appId.trim()) return null
  const app = await prisma.oAuthApp.findFirst({
    where: { id: appId, userId },
    select: OWNED_APP_SELECT,
  })
  if (!app) return null
  const counts = await countConnectedUsersByApp([app.id])
  return { ...app, connectedUserCount: counts.get(app.id) ?? 0 }
}

export type OwnedOAuthAppMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "invalid"; errors: OAuthAppFieldError[] }
  | { ok: false; reason: "not_found" }

/**
 * Create an OAuth app owned by `userId`. The client secret is returned once;
 * only its sha256 is stored.
 */
export async function createOwnedOAuthAppForUser(
  userId: string,
  input: OAuthAppInput,
): Promise<
  OwnedOAuthAppMutationResult<{ app: OwnedOAuthApp; clientSecret: string }>
> {
  const parsed = validateOAuthAppInput(input, "create")
  if (!parsed.ok) return { ok: false, reason: "invalid", errors: parsed.errors }

  const clientSecret = generateClientSecret()
  const app = await prisma.oAuthApp.create({
    data: {
      userId,
      name: parsed.value.name!,
      description: parsed.value.description ?? null,
      clientId: generateClientId(),
      clientSecretHash: sha256(clientSecret),
      redirectUris: parsed.value.redirectUris!,
      scopes: parsed.value.scopes!,
      secretRotatedAt: new Date(),
    },
    select: OWNED_APP_SELECT,
  })

  return {
    ok: true,
    data: { app: { ...app, connectedUserCount: 0 }, clientSecret },
  }
}

/**
 * Owner-only edit of name, description, redirect URIs and scopes.
 *
 * Existing grants are deliberately untouched: a token keeps the scopes it was
 * granted (refresh carries them forward) until the user reconnects or is
 * revoked. The app's scope list only gates future /oauth/authorize requests.
 */
export async function updateOwnedOAuthAppForUser(
  userId: string,
  appId: string,
  input: OAuthAppInput,
): Promise<OwnedOAuthAppMutationResult<{ app: OwnedOAuthApp }>> {
  if (!appId.trim()) return { ok: false, reason: "not_found" }

  const parsed = validateOAuthAppInput(input, "update")
  if (!parsed.ok) return { ok: false, reason: "invalid", errors: parsed.errors }

  const updated = await prisma.oAuthApp.updateMany({
    where: { id: appId, userId },
    data: parsed.value,
  })
  if (updated.count === 0) return { ok: false, reason: "not_found" }

  const app = await getOwnedOAuthAppForUser(userId, appId)
  if (!app) return { ok: false, reason: "not_found" }
  return { ok: true, data: { app } }
}

/**
 * Rotate the client secret for an app the user owns.
 * Returns null when the app is missing or owned by someone else.
 */
export async function rotateOAuthAppSecretForUser(
  userId: string,
  appId: string,
): Promise<{ clientId: string; clientSecret: string; secretRotatedAt: Date } | null> {
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
  const secretRotatedAt = new Date()
  const updated = await prisma.oAuthApp.updateMany({
    where: { id: app.id, userId },
    data: { clientSecretHash: sha256(clientSecret), secretRotatedAt },
  })

  if (updated.count === 0) {
    return null
  }

  return { clientId: app.clientId, clientSecret, secretRotatedAt }
}

/**
 * Delete an owned app. Its grants and codes cascade, so every connected user
 * loses access immediately; `disconnectedUserCount` is how many (measured just
 * before the delete) for the confirmation / toast copy.
 */
export async function deleteOwnedOAuthAppForUser(
  userId: string,
  appId: string,
): Promise<{ deleted: boolean; disconnectedUserCount: number }> {
  if (!appId.trim()) {
    return { deleted: false, disconnectedUserCount: 0 }
  }

  const app = await prisma.oAuthApp.findFirst({
    where: { id: appId, userId },
    select: { id: true },
  })
  if (!app) {
    return { deleted: false, disconnectedUserCount: 0 }
  }

  const counts = await countConnectedUsersByApp([app.id])
  const result = await prisma.oAuthApp.deleteMany({
    where: { id: app.id, userId },
  })

  return {
    deleted: result.count > 0,
    disconnectedUserCount: result.count > 0 ? (counts.get(app.id) ?? 0) : 0,
  }
}

/** JSON shape for owned apps in route handlers (dates as ISO strings). */
export function serializeOwnedOAuthApp(app: OwnedOAuthApp) {
  return {
    ...app,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    secretRotatedAt: app.secretRotatedAt?.toISOString() ?? null,
  }
}
