import { redirectUriProblem } from "@/lib/api/redirect-uri"
import { isValidScope, type ApiScope } from "@/lib/api/scopes"

/**
 * Validation shared by "Add app" (create) and "Manage" (edit) for OAuth apps a
 * user owns. Messages are the user-facing copy from the Connections settings
 * design, so the UI can render `errors[n].message` under the matching field.
 */

export const OAUTH_APP_NAME_MAX_LENGTH = 80
export const OAUTH_APP_DESCRIPTION_MAX_LENGTH = 300
export const OAUTH_APP_MAX_REDIRECT_URIS = 10

/** `form` is for errors that belong to no single field. */
export type OAuthAppField = "name" | "description" | "redirectUris" | "scopes" | "form"

export type OAuthAppFieldError = {
  /** `redirectUris` errors about one URI also carry its index in the input. */
  field: OAuthAppField
  index?: number
  message: string
}

export type OAuthAppInput = {
  name?: string
  description?: string | null
  redirectUris?: string[]
  scopes?: string[]
}

export type NormalizedOAuthAppInput = {
  name?: string
  description?: string | null
  redirectUris?: string[]
  scopes?: ApiScope[]
}

export const OAUTH_APP_ERROR_MESSAGES = {
  nameRequired: "Name is required.",
  nameTooLong: `Keep the name under ${OAUTH_APP_NAME_MAX_LENGTH} characters.`,
  descriptionTooLong: `Keep the description under ${OAUTH_APP_DESCRIPTION_MAX_LENGTH} characters.`,
  redirectUriRequired: "At least one redirect URI is required.",
  tooManyRedirectUris: `Add at most ${OAUTH_APP_MAX_REDIRECT_URIS} redirect URIs.`,
  redirectUriNotAbsolute: "Enter a full URL, like https://example.com/callback.",
  redirectUriHttps: "Use https, or http only for localhost.",
  redirectUriWildcard: "Redirect URIs cannot contain a wildcard.",
  redirectUriFragment: "Full URLs only. No # fragments.",
  redirectUriCredentials: "No user:password in the link.",
  scopeRequired: "Choose at least one permission.",
  scopeUnknown: "Unknown permission.",
  nothingToUpdate: "Nothing to update.",
} as const

/** Map `redirectUriProblem()` output onto the design copy. */
export function redirectUriErrorMessage(uri: string): string | null {
  const problem = redirectUriProblem(uri)
  if (!problem) return null
  if (problem === "is not an absolute URL") return OAUTH_APP_ERROR_MESSAGES.redirectUriNotAbsolute
  if (problem === "must not contain a fragment") return OAUTH_APP_ERROR_MESSAGES.redirectUriFragment
  if (problem === "must not contain credentials") return OAUTH_APP_ERROR_MESSAGES.redirectUriCredentials
  if (problem === "must not contain a wildcard") return OAUTH_APP_ERROR_MESSAGES.redirectUriWildcard
  return OAUTH_APP_ERROR_MESSAGES.redirectUriHttps
}

export type OAuthAppValidationResult =
  | { ok: true; value: NormalizedOAuthAppInput }
  | { ok: false; errors: OAuthAppFieldError[] }

/**
 * Validate and normalize app input.
 *
 * - `mode: "create"` requires name, redirectUris and scopes.
 * - `mode: "update"` validates only the fields present (PATCH semantics) and
 *   requires at least one of them.
 *
 * Redirect URIs are trimmed, blanks dropped and duplicates removed (first
 * occurrence wins). Scopes are de-duplicated; any unknown scope is an error
 * rather than silently dropped so the UI never saves less than it showed.
 */
export function validateOAuthAppInput(
  input: OAuthAppInput,
  mode: "create" | "update",
): OAuthAppValidationResult {
  const errors: OAuthAppFieldError[] = []
  const value: NormalizedOAuthAppInput = {}
  const requireAll = mode === "create"

  if (input.name !== undefined || requireAll) {
    const name = typeof input.name === "string" ? input.name.trim() : ""
    if (!name) {
      errors.push({ field: "name", message: OAUTH_APP_ERROR_MESSAGES.nameRequired })
    } else if (name.length > OAUTH_APP_NAME_MAX_LENGTH) {
      errors.push({ field: "name", message: OAUTH_APP_ERROR_MESSAGES.nameTooLong })
    } else {
      value.name = name
    }
  }

  if (input.description !== undefined) {
    const description =
      typeof input.description === "string" ? input.description.trim() : ""
    if (description.length > OAUTH_APP_DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: "description",
        message: OAUTH_APP_ERROR_MESSAGES.descriptionTooLong,
      })
    } else {
      value.description = description || null
    }
  } else if (requireAll) {
    value.description = null
  }

  if (input.redirectUris !== undefined || requireAll) {
    const raw = Array.isArray(input.redirectUris) ? input.redirectUris : []
    const seen = new Set<string>()
    const redirectUris: string[] = []
    let uriErrors = 0
    raw.forEach((entry, index) => {
      const uri = typeof entry === "string" ? entry.trim() : ""
      if (!uri) return
      const message = redirectUriErrorMessage(uri)
      if (message) {
        uriErrors += 1
        errors.push({ field: "redirectUris", index, message })
        return
      }
      if (!seen.has(uri)) {
        seen.add(uri)
        redirectUris.push(uri)
      }
    })
    if (uriErrors === 0) {
      if (redirectUris.length === 0) {
        errors.push({
          field: "redirectUris",
          message: OAUTH_APP_ERROR_MESSAGES.redirectUriRequired,
        })
      } else if (redirectUris.length > OAUTH_APP_MAX_REDIRECT_URIS) {
        errors.push({
          field: "redirectUris",
          message: OAUTH_APP_ERROR_MESSAGES.tooManyRedirectUris,
        })
      } else {
        value.redirectUris = redirectUris
      }
    }
  }

  if (input.scopes !== undefined || requireAll) {
    const raw = Array.isArray(input.scopes) ? input.scopes : []
    const scopes: ApiScope[] = []
    let unknown = false
    for (const entry of raw) {
      const scope = typeof entry === "string" ? entry.trim() : ""
      if (!isValidScope(scope)) {
        unknown = true
        continue
      }
      if (!scopes.includes(scope)) scopes.push(scope)
    }
    if (unknown) {
      errors.push({ field: "scopes", message: OAUTH_APP_ERROR_MESSAGES.scopeUnknown })
    } else if (scopes.length === 0) {
      errors.push({ field: "scopes", message: OAUTH_APP_ERROR_MESSAGES.scopeRequired })
    } else {
      value.scopes = scopes
    }
  }

  if (
    mode === "update" &&
    errors.length === 0 &&
    value.name === undefined &&
    value.description === undefined &&
    value.redirectUris === undefined &&
    value.scopes === undefined
  ) {
    errors.push({ field: "form", message: OAUTH_APP_ERROR_MESSAGES.nothingToUpdate })
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value }
}
