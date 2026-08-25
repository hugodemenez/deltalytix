export interface RithmicBalanceCredentials {
  username: string
  password: string
  server_type: string
  location: string
}

export interface RithmicAccountBalance {
  account_id: string
  fcm_id?: string
  ib_id?: string
  account_balance?: number
  cash_on_hand?: number
  margin_balance?: number
  available_buying_power?: number
  open_pnl?: number
  closed_pnl?: number
  day_pnl?: number
}

/** Raw balance payloads may use snake_case or camelCase field names. */
export type RithmicAccountBalanceInput = {
  account_id?: string
  accountId?: string
  fcm_id?: string
  ib_id?: string
  account_balance?: number | string
  accountBalance?: number | string
  cash_on_hand?: number | string
  cashOnHand?: number | string
  margin_balance?: number | string
  marginBalance?: number | string
  available_buying_power?: number | string
  availableBuyingPower?: number | string
  open_pnl?: number | string
  openPnl?: number | string
  closed_pnl?: number | string
  closedPnl?: number | string
  day_pnl?: number | string
  dayPnl?: number | string
}

export interface RithmicRateLimitInfo {
  remaining_attempts: number
  minutes_until_reset: number
}

export type FetchRithmicBalancesResult =
  | {
      success: true
      balances: RithmicAccountBalance[]
      rateLimitInfo?: RithmicRateLimitInfo
      httpStatus: number
      message?: string
    }
  | {
      success: false
      rateLimited: boolean
      message: string
      httpStatus?: number
    }

function getRithmicProtocols() {
  const isLocalhost =
    process.env.NEXT_PUBLIC_RITHMIC_API_URL?.includes("localhost")
  if (typeof window === "undefined") {
    return { http: "https:" }
  }
  return {
    http: isLocalhost ? window.location.protocol : "https:",
  }
}

export function getRithmicApiBaseUrl(): string | null {
  const host = process.env.NEXT_PUBLIC_RITHMIC_API_URL
  if (!host) return null
  const { http } = getRithmicProtocols()
  return `${http}//${host}`
}

export function parseRithmicRateLimitMessage(detail: string) {
  const match = detail.match(
    /Maximum (\d+) attempts allowed per (\d+\.?\d*) minutes\. Please wait (\d+\.?\d*) minutes/
  )
  return match
    ? { max: match[1], period: match[2], wait: match[3] }
    : { max: "2", period: "15", wait: "12" }
}

type PydanticLikeError = {
  type?: string
  loc?: unknown
  msg?: string
  input?: unknown
}

export function formatRithmicApiErrorMessage(
  value: unknown,
  fallback = "Unknown error"
): string {
  if (value == null || value === "") return fallback
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatRithmicApiErrorMessage(item, ""))
      .filter((part) => part.length > 0)
    return parts.length > 0 ? parts.join("; ") : fallback
  }
  if (typeof value === "object") {
    const err = value as PydanticLikeError
    if (typeof err.msg === "string") {
      const loc = Array.isArray(err.loc)
        ? err.loc.map((part) => String(part)).join(".")
        : ""
      return loc ? `${loc}: ${err.msg}` : err.msg
    }
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }
  return String(value)
}

export async function fetchRithmicBalances(
  credentials: RithmicBalanceCredentials,
  options?: { signal?: AbortSignal }
): Promise<FetchRithmicBalancesResult> {
  const baseUrl = getRithmicApiBaseUrl()
  if (!baseUrl) {
    return {
      success: false,
      rateLimited: false,
      message: "Rithmic API URL is not configured",
    }
  }

  const response = await fetch(`${baseUrl}/balances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    signal: options?.signal,
  })

  if (response.status === 429) {
    const data = await response.json().catch(() => ({}))
    const detailMessage = formatRithmicApiErrorMessage(
      data.detail,
      "Rate limit exceeded"
    )
    return {
      success: false,
      rateLimited: true,
      message: detailMessage,
      httpStatus: response.status,
    }
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) {
    return {
      success: false,
      rateLimited: false,
      message: formatRithmicApiErrorMessage(
        data?.message ?? data?.detail,
        "Failed to fetch balances"
      ),
      httpStatus: response.status,
    }
  }

  return {
    success: true,
    balances: data.balances ?? [],
    rateLimitInfo: data.rate_limit_info,
    httpStatus: response.status,
    message: formatRithmicApiErrorMessage(data.message, ""),
  }
}

export function getPrimaryRithmicBalance(balance: RithmicAccountBalance): number | null {
  const accountBalance = toNumericBalance(balance.account_balance)
  if (accountBalance != null) return accountBalance
  const cashOnHand = toNumericBalance(balance.cash_on_hand)
  if (cashOnHand != null) return cashOnHand
  const marginBalance = toNumericBalance(balance.margin_balance)
  if (marginBalance != null) return marginBalance
  return null
}

function toNumericBalance(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeRithmicAccountId(value: unknown): string {
  return String(value ?? "").trim()
}

/** Canonical map key so `APEX-123` and `apex-123` collapse to one row. */
export function rithmicBalanceMapKey(accountId: string): string {
  return normalizeRithmicAccountId(accountId).toLowerCase()
}

export function putRithmicBalance(
  merged: Record<string, RithmicAccountBalance>,
  balance: RithmicAccountBalance,
  options?: { overwrite?: boolean }
): void {
  const key = rithmicBalanceMapKey(balance.account_id)
  if (!key) return
  if (!options?.overwrite && key in merged) return
  merged[key] = balance
}

export function isRithmicConnectionService(
  service: string | null | undefined
): boolean {
  return service === "rithmic" || service === "rithmic-protocol"
}

export function isRithmicProtocolConnectionService(
  service: string | null | undefined
): boolean {
  return service === "rithmic-protocol"
}

export function normalizeRithmicAccountBalance(
  balance: RithmicAccountBalanceInput
): RithmicAccountBalance | null {
  const {
    account_id,
    accountId,
    fcm_id,
    ib_id,
    account_balance,
    accountBalance,
    cash_on_hand,
    cashOnHand,
    margin_balance,
    marginBalance,
    available_buying_power,
    availableBuyingPower,
    open_pnl,
    openPnl,
    closed_pnl,
    closedPnl,
    day_pnl,
    dayPnl,
    ...rest
  } = balance

  const normalizedAccountId =
    normalizeRithmicAccountId(account_id) ||
    normalizeRithmicAccountId(accountId)
  if (!normalizedAccountId) return null

  return {
    ...rest,
    account_id: normalizedAccountId,
    fcm_id,
    ib_id,
    account_balance:
      toNumericBalance(account_balance ?? accountBalance) ?? undefined,
    cash_on_hand: toNumericBalance(cash_on_hand ?? cashOnHand) ?? undefined,
    margin_balance:
      toNumericBalance(margin_balance ?? marginBalance) ?? undefined,
    available_buying_power:
      toNumericBalance(available_buying_power ?? availableBuyingPower) ??
      undefined,
    open_pnl: toNumericBalance(open_pnl ?? openPnl) ?? undefined,
    closed_pnl: toNumericBalance(closed_pnl ?? closedPnl) ?? undefined,
    day_pnl: toNumericBalance(day_pnl ?? dayPnl) ?? undefined,
  }
}

/**
 * Resolve a dashboard account number against fetched Rithmic balances.
 * Prefers exact match, then trimmed/case-insensitive fallback.
 */
export function findRithmicBalanceForAccount(
  accountNumber: string | null | undefined,
  balancesByAccountId: Record<string, RithmicAccountBalance>
): RithmicAccountBalance | null {
  const needle = normalizeRithmicAccountId(accountNumber)
  if (!needle) return null

  const exact = balancesByAccountId[needle]
  if (exact) return exact

  const byKey = balancesByAccountId[rithmicBalanceMapKey(needle)]
  if (byKey) return byKey

  const needleLower = needle.toLowerCase()
  for (const [accountId, balance] of Object.entries(balancesByAccountId)) {
    if (normalizeRithmicAccountId(accountId).toLowerCase() === needleLower) {
      return balance
    }
  }
  return null
}

function accountIdsMatch(left: string, right: string): boolean {
  return rithmicBalanceMapKey(left) === rithmicBalanceMapKey(right)
}

/**
 * After a refresh, keep the last good map only while a source still exists.
 * Once classic credentials and Protocol connections are both gone, drop the
 * stale Solde values so the column does not linger until remount.
 */
export function resolveDisplayedRithmicBalances(options: {
  hasAnySource: boolean
  anySucceeded: boolean
  merged: Record<string, RithmicAccountBalance>
  previous: Record<string, RithmicAccountBalance>
}): Record<string, RithmicAccountBalance> {
  if (!options.hasAnySource) return {}
  return options.anySucceeded ? options.merged : options.previous
}

export function isRithmicLinkedAccount(
  accountNumber: string,
  balancesByAccountId: Record<string, RithmicAccountBalance>,
  linkedAccountNumbers?: Set<string> | string[]
): boolean {
  if (findRithmicBalanceForAccount(accountNumber, balancesByAccountId)) {
    return true
  }
  if (!linkedAccountNumbers) return false
  for (const id of linkedAccountNumbers) {
    if (accountIdsMatch(accountNumber, id)) return true
  }
  return false
}
