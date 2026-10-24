"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { resolveDbUserId } from "@/lib/api/db-user"
import { getOAuthIssuer } from "@/lib/agent-discovery/metadata"
import {
  authorizationCodeExpiresAt,
  generateAuthorizationCode,
  sha256,
} from "@/lib/api/tokens"
import { authorizePkceProblem } from "@/lib/api/oauth-pkce"
import {
  canonicalMcpResource,
  resourceIndicatorProblem,
} from "@/lib/api/oauth-resource"
import { revokePriorOAuthGrantsForUserApp } from "@/lib/api/revoke-prior-oauth-grants"
import { isValidScope, parseScopes } from "@/lib/api/scopes"

export type AuthorizeParams = {
  clientId: string
  redirectUri: string
  responseType: string
  scope: string
  state?: string
  codeChallenge?: string
  codeChallengeMethod?: string
  resource?: string
  issuer: string
}

async function requestIssuer(): Promise<string> {
  const headerList = await headers()
  return getOAuthIssuer(new Request("http://localhost", { headers: headerList }))
}

function withIssuer(redirectUri: string, issuer: string, params: Record<string, string>) {
  const url = new URL(redirectUri)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  url.searchParams.set("iss", issuer)
  return url
}

export async function loadAuthorizeContext(params: AuthorizeParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authenticated: false as const }
  }

  if (params.responseType !== "code") {
    return {
      authenticated: true as const,
      error: "unsupported_response_type" as const,
      message: "Only response_type=code is supported",
    }
  }

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: params.clientId },
  })

  if (!app) {
    return {
      authenticated: true as const,
      error: "invalid_client" as const,
      message: "Unknown client_id",
    }
  }

  if (!app.redirectUris.includes(params.redirectUri)) {
    return {
      authenticated: true as const,
      error: "invalid_redirect_uri" as const,
      message: "redirect_uri does not match a registered URI",
    }
  }

  const oauthErrorRedirect = {
    redirectUri: params.redirectUri,
    state: params.state,
    issuer: params.issuer,
  }

  const requested = parseScopes(params.scope).filter(isValidScope)
  if (requested.length === 0) {
    return {
      authenticated: true as const,
      error: "invalid_scope" as const,
      message: "At least one valid scope is required",
      ...oauthErrorRedirect,
    }
  }

  const allowed = new Set(app.scopes)
  const unauthorized = requested.filter((s) => !allowed.has(s))
  if (unauthorized.length > 0) {
    return {
      authenticated: true as const,
      error: "invalid_scope" as const,
      message: `App is not allowed to request: ${unauthorized.join(", ")}`,
      ...oauthErrorRedirect,
    }
  }

  const pkceProblem = authorizePkceProblem(
    app,
    params.codeChallenge,
    params.codeChallengeMethod,
  )
  if (pkceProblem) {
    return {
      authenticated: true as const,
      error: "invalid_request" as const,
      message: pkceProblem,
      ...oauthErrorRedirect,
    }
  }

  const resource = params.resource?.trim() || ""
  if (resource) {
    const resourceProblem = resourceIndicatorProblem(resource, params.issuer)
    if (resourceProblem) {
      return {
        authenticated: true as const,
        error: "invalid_target" as const,
        message: resourceProblem,
        ...oauthErrorRedirect,
      }
    }
  }

  return {
    authenticated: true as const,
    email: user.email ?? "",
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      logoUrl: app.logoUrl,
      clientId: app.clientId,
    },
    scopes: requested,
    redirectUri: params.redirectUri,
    state: params.state,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    resource: resource ? canonicalMcpResource(params.issuer) : undefined,
  }
}

export async function approveAuthorizationAction(formData: FormData) {
  const userId = await resolveDbUserId()
  const clientId = String(formData.get("client_id") || "")
  const redirectUri = String(formData.get("redirect_uri") || "")
  const scope = String(formData.get("scope") || "")
  const state = String(formData.get("state") || "")
  const codeChallenge = String(formData.get("code_challenge") || "") || undefined
  const codeChallengeMethod =
    String(formData.get("code_challenge_method") || "") || undefined
  const resourceField = String(formData.get("resource") || "").trim()

  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app || !app.redirectUris.includes(redirectUri)) {
    throw new Error("Invalid authorization request")
  }

  if (authorizePkceProblem(app, codeChallenge, codeChallengeMethod)) {
    throw new Error("Invalid authorization request")
  }

  const issuer = await requestIssuer()
  let resource: string | null = null
  if (resourceField) {
    if (resourceIndicatorProblem(resourceField, issuer)) {
      throw new Error("Invalid authorization request")
    }
    resource = canonicalMcpResource(issuer)
  }

  // The consent screen renders hidden inputs, so re-check everything
  // `loadAuthorizeContext` checked: a tampered form must not be able to mint a
  // code for scopes the app was never registered to request.
  const allowed = new Set(app.scopes)
  const scopes = parseScopes(scope)
    .filter(isValidScope)
    .filter((granted) => allowed.has(granted))

  if (scopes.length === 0) {
    throw new Error("Invalid authorization request")
  }

  const code = generateAuthorizationCode()

  // Re-consent replaces the prior grant: revoke existing tokens and burn any
  // unused codes for this user+app before minting the new authorization code.
  await prisma.$transaction(async (tx) => {
    await revokePriorOAuthGrantsForUserApp(tx, {
      userId,
      appId: app.id,
    })

    await tx.oAuthAuthorizationCode.create({
      data: {
        codeHash: sha256(code),
        appId: app.id,
        userId,
        scopes,
        redirectUri,
        codeChallenge: codeChallenge ?? null,
        codeChallengeMethod: codeChallengeMethod ?? null,
        resource,
        expiresAt: authorizationCodeExpiresAt(),
      },
    })
  })

  redirect(
    withIssuer(redirectUri, issuer, {
      code,
      ...(state ? { state } : {}),
    }).toString(),
  )
}

export async function denyAuthorizationAction(formData: FormData) {
  const clientId = String(formData.get("client_id") || "")
  const redirectUri = String(formData.get("redirect_uri") || "")
  const state = String(formData.get("state") || "")
  if (!clientId || !redirectUri) throw new Error("Invalid authorization request")

  // Deny redirects to an attacker-chosen URL are still an open redirect off a
  // Deltalytix origin, so the URI has to be a registered one for this client
  // exactly as it does on approve.
  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app || !app.redirectUris.includes(redirectUri)) {
    throw new Error("Invalid authorization request")
  }

  const issuer = await requestIssuer()
  redirect(
    withIssuer(redirectUri, issuer, {
      error: "access_denied",
      ...(state ? { state } : {}),
    }).toString(),
  )
}

/**
 * "Use another account": sign the current user out and send them to sign-in,
 * coming back to this exact consent screen afterwards. `next` is the relative
 * `oauth/authorize?…` target built by the page; anything else is dropped so the
 * form can't be used as an open redirect.
 */
export async function switchAccountAction(formData: FormData) {
  const next = String(formData.get("next") || "")
  const supabase = await createClient()
  await supabase.auth.signOut()
  const safeNext = next.startsWith("oauth/authorize?") ? next : ""
  redirect(
    safeNext
      ? `/authentication?next=${encodeURIComponent(safeNext)}`
      : "/authentication",
  )
}
