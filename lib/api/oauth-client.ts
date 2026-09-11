import { prisma } from "@/lib/prisma"
import { sha256 } from "@/lib/api/tokens"
import type { NextRequest } from "next/server"

export type OAuthClientCredentials = {
  clientId?: string
  clientSecret?: string
}

export type AuthenticatedOAuthApp = {
  id: string
  clientId: string
  clientSecretHash: string
  scopes: string[]
  redirectUris: string[]
}

/** RFC 6749 §2.3.1 — `Authorization: Basic base64(url-encoded-id:url-encoded-secret)`. */
export function parseBasicClientAuth(
  header: string | null | undefined,
): { clientId: string; clientSecret: string } | null {
  if (!header) return null
  const match = header.match(/^Basic\s+(.+)$/i)
  if (!match?.[1]) return null

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8")
    const separator = decoded.indexOf(":")
    if (separator < 0) return null
    const clientId = decodeURIComponent(decoded.slice(0, separator))
    const clientSecret = decodeURIComponent(decoded.slice(separator + 1))
    if (!clientId) return null
    return { clientId, clientSecret }
  } catch {
    return null
  }
}

export function resolveClientCredentials(
  request: Pick<Request, "headers">,
  body: Record<string, string>,
): OAuthClientCredentials {
  const basic = parseBasicClientAuth(request.headers.get("authorization"))
  if (basic) {
    return basic
  }
  return {
    clientId: body.client_id || undefined,
    clientSecret: body.client_secret || undefined,
  }
}

export async function readOAuthFormOrJson(
  request: NextRequest,
): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(json)) {
      if (value != null) out[key] = String(value)
    }
    return out
  }

  const form = await request.formData()
  const out: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value
  })
  return out
}

/**
 * Look up a registered app. When `requireSecret` is true, a matching
 * `client_secret` is mandatory. When false (authorization-code + PKCE), an
 * omitted secret is allowed, but a supplied secret still has to match.
 */
export async function authenticateOAuthClient(
  credentials: OAuthClientCredentials,
  options: { requireSecret: boolean },
): Promise<AuthenticatedOAuthApp | null> {
  const { clientId, clientSecret } = credentials
  if (!clientId) return null

  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app) return null

  if (options.requireSecret || clientSecret) {
    if (!clientSecret || sha256(clientSecret) !== app.clientSecretHash) {
      return null
    }
  }

  return app
}
