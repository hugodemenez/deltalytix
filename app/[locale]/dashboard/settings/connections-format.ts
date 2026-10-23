import { API_SCOPES, type ApiScope } from "@/lib/api/scopes"
import {
  OAUTH_APP_ERROR_MESSAGES,
  type OAuthAppField,
  type OAuthAppFieldError,
} from "@/lib/api/oauth-app-input"

/**
 * Read scopes in the Connections design order. Write scopes follow, also in
 * design order. Both lists together must cover `API_SCOPES`.
 */
export const READ_SCOPES = [
  "profile:read",
  "trades:read",
  "accounts:read",
  "connections:read",
  "metrics:read",
] as const satisfies readonly ApiScope[]

export const WRITE_SCOPES = [
  "trades:write",
  "connections:write",
  "imports:write",
] as const satisfies readonly ApiScope[]

/** Plain-language labels from the Connections proofs. */
export const SCOPE_PLAIN_LABELS: Record<ApiScope, string> = {
  "profile:read": "Read your profile",
  "trades:read": "Read your trades",
  "trades:write": "Create and import trades",
  "accounts:read": "Read your trading accounts",
  "connections:read": "Read your broker connections",
  "connections:write": "Create connections and trigger syncs",
  "imports:write": "Upload and import trade files",
  "metrics:read": "Read performance metrics",
}

const WRITE_SET = new Set<string>(WRITE_SCOPES)

export function isWriteScope(scope: string): boolean {
  return WRITE_SET.has(scope) || scope.endsWith(":write")
}

export function defaultReadScopes(): ApiScope[] {
  return [...READ_SCOPES]
}

export function scopeGroups(selected: readonly string[]) {
  const chosen = new Set(selected)
  const read = READ_SCOPES.map((id) => ({
    id,
    checked: chosen.has(id),
  }))
  const write = WRITE_SCOPES.map((id) => ({
    id,
    checked: chosen.has(id),
  }))
  return {
    read,
    write,
    readChecked: read.filter((scope) => scope.checked).length,
    readTotal: read.length,
  }
}

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

/** "2 Sep 2026" in English. Other locales use the runtime short month. */
export function formatConnectionDate(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  if (locale.toLowerCase().startsWith("en")) {
    return `${date.getDate()} ${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export type LastUsedKind =
  | { kind: "never" }
  | { kind: "justNow" }
  | { kind: "minutes"; count: number }
  | { kind: "hours"; count: number }
  | { kind: "yesterday" }
  | { kind: "date" }

export function classifyLastUsed(
  iso: string | null | undefined,
  now = new Date(),
): LastUsedKind {
  if (!iso) return { kind: "never" }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { kind: "never" }
  const deltaMs = now.getTime() - date.getTime()
  if (deltaMs < 60_000) return { kind: "justNow" }
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 60) return { kind: "minutes", count: minutes }
  const hours = Math.floor(deltaMs / 3_600_000)
  if (hours < 24 && isSameLocalDay(date, now)) return { kind: "hours", count: hours }
  if (isYesterday(date, now)) return { kind: "yesterday" }
  if (hours < 24) return { kind: "hours", count: Math.max(hours, 1) }
  return { kind: "date" }
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isYesterday(date: Date, now: Date): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const previous = new Date(start)
  previous.setDate(start.getDate() - 1)
  return isSameLocalDay(date, previous)
}

/** `dltx_app_3fK9…` — first 12 characters, then an ellipsis. */
export function truncateIdentifier(value: string, visible = 12): string {
  if (value.length <= visible) return value
  return `${value.slice(0, visible)}…`
}

/**
 * Personal tokens are stored as hashes, so the list cannot show a real suffix
 * unless this session just created the token and still has the secret.
 */
export function maskTokenPrefix(last4?: string | null): string {
  return last4 ? `dltx_••••${last4}` : "dltx_••••"
}

export function tokenLast4(token: string): string {
  return token.slice(-4)
}

/**
 * One word with an inner capital becomes two letters (TradeSync → TS).
 * A name with a space uses only its first letter (Notion importer → N).
 */
export function appInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  if (/\s/.test(trimmed)) return trimmed[0]!.toUpperCase()
  const humps = trimmed.match(/[A-Z][a-z]+|[A-Z]+(?![a-z])|[a-z]+/g) ?? [trimmed]
  if (humps.length >= 2) {
    return `${humps[0]![0] ?? ""}${humps[1]![0] ?? ""}`.toUpperCase()
  }
  return trimmed[0]!.toUpperCase()
}

const APP_COLORS = ["#2563EB", "#171717", "#0F766E", "#7C3AED", "#B45309", "#BE123C"]

export function appColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return APP_COLORS[hash % APP_COLORS.length]!
}

export function fieldErrorMessage(
  errors: readonly OAuthAppFieldError[],
  field: OAuthAppField,
): string | undefined {
  return errors.find((error) => error.field === field && error.index === undefined)?.message
}

export function uriRowErrorMessage(
  errors: readonly OAuthAppFieldError[],
  index: number,
): string | undefined {
  return errors.find((error) => error.field === "redirectUris" && error.index === index)?.message
}

export function firstErrorStep(errors: readonly OAuthAppFieldError[]): 1 | 2 | 3 {
  if (errors.some((error) => error.field === "name" || error.field === "description")) {
    return 1
  }
  if (errors.some((error) => error.field === "redirectUris")) return 2
  return 3
}

export type AppDraft = {
  name: string
  description: string
  redirectUris: string[]
  scopes: string[]
}

export function draftFromApp(app: {
  name: string
  description: string | null
  redirectUris: string[]
  scopes: string[]
}): AppDraft {
  return {
    name: app.name,
    description: app.description ?? "",
    redirectUris: app.redirectUris.length > 0 ? [...app.redirectUris] : [""],
    scopes: [...app.scopes],
  }
}

export function draftsEqual(a: AppDraft, b: AppDraft): boolean {
  if (a.name !== b.name || a.description !== b.description) return false
  if (a.redirectUris.length !== b.redirectUris.length) return false
  if (a.redirectUris.some((uri, index) => uri !== b.redirectUris[index])) return false
  if (a.scopes.length !== b.scopes.length) return false
  const left = [...a.scopes].sort()
  const right = [...b.scopes].sort()
  return left.every((scope, index) => scope === right[index])
}

export function redirectHost(uri: string): string {
  try {
    return new URL(uri).host
  } catch {
    return uri
  }
}

export function secretRotatedSource(app: {
  secretRotatedAt: string | null
  createdAt: string
}): string {
  return app.secretRotatedAt ?? app.createdAt
}

/** Scopes known to the API, in design order, so a new scope fails the test. */
export function knownScopeCoverage(): string[] {
  return [...READ_SCOPES, ...WRITE_SCOPES].slice().sort()
}

export function apiScopeCoverage(): string[] {
  return [...API_SCOPES].slice().sort()
}

export function countLabelKind(count: number): "none" | "one" | "many" {
  if (count <= 0) return "none"
  if (count === 1) return "one"
  return "many"
}

/** The last redirect URI cannot be removed. */
export function canRemoveRedirectUri(count: number): boolean {
  return count > 1
}

/**
 * Locale keys for the server validation copy. The API keeps returning English
 * `message` strings (the public contract), and the settings UI swaps each one
 * for its translation. Messages are shared constants, so the match is exact.
 */
export const OAUTH_APP_ERROR_LOCALE_KEYS = {
  nameRequired: "validation.nameRequired",
  nameTooLong: "validation.nameTooLong",
  descriptionTooLong: "validation.descriptionTooLong",
  redirectUriRequired: "validation.redirectUriRequired",
  tooManyRedirectUris: "validation.redirectUrisTooMany",
  redirectUriNotAbsolute: "validation.redirectUriInvalid",
  redirectUriHttps: "validation.redirectUriScheme",
  redirectUriFragment: "validation.redirectUriFragment",
  redirectUriCredentials: "validation.redirectUriUserinfo",
  scopeRequired: "validation.scopesRequired",
  scopeUnknown: "validation.scopeUnknown",
  nothingToUpdate: "validation.nothingToUpdate",
} as const satisfies Record<keyof typeof OAUTH_APP_ERROR_MESSAGES, `validation.${string}`>

export type OAuthAppErrorLocaleKey =
  (typeof OAUTH_APP_ERROR_LOCALE_KEYS)[keyof typeof OAUTH_APP_ERROR_LOCALE_KEYS]

const MESSAGE_TO_LOCALE_KEY = new Map<string, OAuthAppErrorLocaleKey>(
  (Object.keys(OAUTH_APP_ERROR_MESSAGES) as (keyof typeof OAUTH_APP_ERROR_MESSAGES)[]).map(
    (code) => [OAUTH_APP_ERROR_MESSAGES[code], OAUTH_APP_ERROR_LOCALE_KEYS[code]],
  ),
)

/** The locale key for a server validation message, or undefined if unknown. */
export function oauthAppErrorLocaleKey(message: string): OAuthAppErrorLocaleKey | undefined {
  return MESSAGE_TO_LOCALE_KEY.get(message)
}

/** Translate a known validation message; unknown messages pass through. */
export function localizeOAuthAppMessage(
  message: string,
  translate: (key: OAuthAppErrorLocaleKey) => string,
): string {
  const key = oauthAppErrorLocaleKey(message)
  return key ? translate(key) : message
}

export function localizeOAuthAppErrors(
  errors: readonly OAuthAppFieldError[],
  translate: (key: OAuthAppErrorLocaleKey) => string,
): OAuthAppFieldError[] {
  return errors.map((error) => ({
    ...error,
    message: localizeOAuthAppMessage(error.message, translate),
  }))
}
