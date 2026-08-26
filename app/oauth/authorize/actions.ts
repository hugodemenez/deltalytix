"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { resolveDbUserId } from "@/lib/api/db-user"
import {
  authorizationCodeExpiresAt,
  generateAuthorizationCode,
  sha256,
} from "@/lib/api/tokens"
import { isValidScope, parseScopes } from "@/lib/api/scopes"

export type AuthorizeParams = {
  clientId: string
  redirectUri: string
  responseType: string
  scope: string
  state?: string
  codeChallenge?: string
  codeChallengeMethod?: string
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

  const requested = parseScopes(params.scope).filter(isValidScope)
  if (requested.length === 0) {
    return {
      authenticated: true as const,
      error: "invalid_scope" as const,
      message: "At least one valid scope is required",
    }
  }

  const allowed = new Set(app.scopes)
  const unauthorized = requested.filter((s) => !allowed.has(s))
  if (unauthorized.length > 0) {
    return {
      authenticated: true as const,
      error: "invalid_scope" as const,
      message: `App is not allowed to request: ${unauthorized.join(", ")}`,
    }
  }

  if (
    params.codeChallengeMethod &&
    params.codeChallengeMethod !== "S256"
  ) {
    return {
      authenticated: true as const,
      error: "invalid_request" as const,
      message: "Only code_challenge_method=S256 is supported",
    }
  }

  return {
    authenticated: true as const,
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

  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app || !app.redirectUris.includes(redirectUri)) {
    throw new Error("Invalid authorization request")
  }

  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    throw new Error("Invalid authorization request")
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

  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: sha256(code),
      appId: app.id,
      userId,
      scopes,
      redirectUri,
      codeChallenge: codeChallenge ?? null,
      codeChallengeMethod: codeChallengeMethod ?? null,
      expiresAt: authorizationCodeExpiresAt(),
    },
  })

  const url = new URL(redirectUri)
  url.searchParams.set("code", code)
  if (state) url.searchParams.set("state", state)
  redirect(url.toString())
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

  const url = new URL(redirectUri)
  url.searchParams.set("error", "access_denied")
  if (state) url.searchParams.set("state", state)
  redirect(url.toString())
}
