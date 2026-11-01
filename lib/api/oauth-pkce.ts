const S256_CHALLENGE = /^[A-Za-z0-9_-]{43,128}$/

export type PkceClient = {
  tokenEndpointAuthMethod?: string | null
  clientSecretHash?: string | null
}

/** A public client has no secret. Confidential clients keep the secret check. */
export function isPublicOAuthClient(app: PkceClient): boolean {
  return app.tokenEndpointAuthMethod === "none" || app.clientSecretHash == null
}

/**
 * Public clients must send S256. Confidential clients may omit PKCE; when
 * they send it, only S256 is accepted.
 */
export function authorizePkceProblem(
  app: PkceClient,
  codeChallenge?: string | null,
  codeChallengeMethod?: string | null,
): string | null {
  const challenge = codeChallenge?.trim() || ""
  const method = codeChallengeMethod?.trim() || ""
  const publicClient = isPublicOAuthClient(app)

  if (!challenge && !method) {
    return publicClient
      ? "Public clients must send code_challenge_method=S256 and a base64url code_challenge"
      : null
  }

  if (method !== "S256" || !S256_CHALLENGE.test(challenge)) {
    return "PKCE requires code_challenge_method=S256 and a base64url code_challenge"
  }

  return null
}
