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

export function normalizeRithmicAccountBalance(
  balance: RithmicAccountBalanceInput
): RithmicAccountBalance | null {
  const accountId =
    normalizeRithmicAccountId(balance.account_id) ||
    normalizeRithmicAccountId(balance.accountId)
  if (!accountId) return null

  return {
    account_id: accountId,
    fcm_id: balance.fcm_id,
    ib_id: balance.ib_id,
    account_balance:
      toNumericBalance(balance.account_balance ?? balance.accountBalance) ??
      undefined,
    cash_on_hand:
      toNumericBalance(balance.cash_on_hand ?? balance.cashOnHand) ?? undefined,
    margin_balance:
      toNumericBalance(balance.margin_balance ?? balance.marginBalance) ??
      undefined,
    available_buying_power:
      toNumericBalance(
        balance.available_buying_power ?? balance.availableBuyingPower
      ) ?? undefined,
    open_pnl: toNumericBalance(balance.open_pnl ?? balance.openPnl) ?? undefined,
    closed_pnl:
      toNumericBalance(balance.closed_pnl ?? balance.closedPnl) ?? undefined,
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

  const needleLower = needle.toLowerCase()
  for (const [accountId, balance] of Object.entries(balancesByAccountId)) {
    if (normalizeRithmicAccountId(accountId).toLowerCase() === needleLower) {
      return balance
    }
  }
  return null
}
