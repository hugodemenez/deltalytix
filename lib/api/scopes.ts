export const API_SCOPES = [
  "profile:read",
  "trades:read",
  "trades:write",
  "accounts:read",
  "connections:read",
  "connections:write",
  "imports:write",
  "metrics:read",
] as const

export type ApiScope = (typeof API_SCOPES)[number]

export const API_SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  "profile:read": "Read your profile information",
  "trades:read": "Read your trades",
  "trades:write": "Create and import trades",
  "accounts:read": "Read your trading accounts",
  "connections:read": "Read your broker connections",
  "connections:write": "Create connections and trigger syncs",
  "imports:write": "Upload and import trade files",
  "metrics:read": "Read performance metrics",
}

export function isValidScope(scope: string): scope is ApiScope {
  return (API_SCOPES as readonly string[]).includes(scope)
}

export function parseScopes(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  const parts = Array.isArray(value) ? value : value.split(/[\s,]+/)
  return [...new Set(parts.map((s) => s.trim()).filter(Boolean))]
}

export function hasRequiredScopes(
  granted: string[],
  required: string[] | undefined,
): boolean {
  if (!required || required.length === 0) return true
  const set = new Set(granted)
  return required.every((scope) => set.has(scope))
}
