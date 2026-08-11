"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { isValidScope } from "@/lib/api/scopes"
import {
  generatePersonalAccessToken,
  sha256,
} from "@/lib/api/tokens"

const DOCS_PLAYGROUND_TOKEN_NAME = "Docs playground"

const DOCS_PLAYGROUND_READ_SCOPES = [
  "profile:read",
  "trades:read",
  "accounts:read",
  "connections:read",
  "metrics:read",
] as const

const SCHEMA_MISSING_MESSAGE =
  "OAuth token tables are missing on this database. Run `bunx prisma migrate deploy` (or apply the `add_oauth_tables` migration), then try again."

function isMissingOAuthTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as {
    code?: string
    meta?: { modelName?: string; table?: string }
    message?: string
  }
  if (candidate.code === "P2021") {
    const haystack = [
      candidate.meta?.modelName,
      candidate.meta?.table,
      candidate.message,
    ]
      .filter(Boolean)
      .join(" ")
    return /OAuthAccessToken|OAuthApp|OAuthAuthorizationCode/i.test(haystack)
  }
  return typeof candidate.message === "string"
    && /OAuthAccessToken|relation .* does not exist/i.test(candidate.message)
}

async function resolveAuthenticatedDbUser(): Promise<{
  id: string
  email: string | null
} | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: user.id }, { auth_user_id: user.id }],
      },
      select: { id: true, email: true },
    })

    if (!dbUser) return null

    return {
      id: dbUser.id,
      email: dbUser.email ?? user.email ?? null,
    }
  } catch {
    return null
  }
}

export async function getDocsPlaygroundAuthAction(): Promise<{
  authenticated: boolean
  email: string | null
}> {
  const user = await resolveAuthenticatedDbUser()
  if (!user) {
    return { authenticated: false, email: null }
  }
  return { authenticated: true, email: user.email }
}

export async function createDocsPlaygroundTokenAction(
  scopes?: string[],
): Promise<{ token: string; id: string } | { error: string }> {
  const user = await resolveAuthenticatedDbUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const requested =
    scopes && scopes.length > 0
      ? scopes.filter(isValidScope)
      : [...DOCS_PLAYGROUND_READ_SCOPES]

  if (requested.length === 0) {
    return { error: "At least one valid scope is required" }
  }

  try {
    // Revoke previous playground tokens with the same name so regenerating stays tidy.
    await prisma.oAuthAccessToken.updateMany({
      where: {
        userId: user.id,
        appId: null,
        name: DOCS_PLAYGROUND_TOKEN_NAME,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })

    const token = generatePersonalAccessToken()
    const record = await prisma.oAuthAccessToken.create({
      data: {
        name: DOCS_PLAYGROUND_TOKEN_NAME,
        tokenHash: sha256(token),
        userId: user.id,
        scopes: requested,
        appId: null,
        expiresAt: null,
      },
    })

    return { id: record.id, token }
  } catch (error) {
    console.error("[docs/playground] createDocsPlaygroundTokenAction failed", error)
    if (isMissingOAuthTableError(error)) {
      return { error: SCHEMA_MISSING_MESSAGE }
    }
    return { error: "Could not create a docs token. Please try again." }
  }
}

export async function revokeDocsPlaygroundTokenAction(
  tokenId: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await resolveAuthenticatedDbUser()
  if (!user || !tokenId) {
    return { ok: true }
  }

  try {
    await prisma.oAuthAccessToken.updateMany({
      where: {
        id: tokenId,
        userId: user.id,
        appId: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
    return { ok: true }
  } catch (error) {
    console.error("[docs/playground] revokeDocsPlaygroundTokenAction failed", error)
    if (isMissingOAuthTableError(error)) {
      return { error: SCHEMA_MISSING_MESSAGE }
    }
    return { error: "Could not revoke the docs token." }
  }
}
