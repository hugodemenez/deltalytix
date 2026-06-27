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
    return {
      success: false,
      rateLimited: true,
      message: data.detail || "Rate limit exceeded",
      httpStatus: response.status,
    }
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) {
    return {
      success: false,
      rateLimited: false,
      message: data?.message || data?.detail || "Failed to fetch balances",
      httpStatus: response.status,
    }
  }

  return {
    success: true,
    balances: data.balances ?? [],
    rateLimitInfo: data.rate_limit_info,
    httpStatus: response.status,
    message: data.message,
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

export function normalizeRithmicAccountBalance(
  balance: RithmicAccountBalance
): RithmicAccountBalance | null {
  const accountId = String(balance.account_id ?? "").trim()
  if (!accountId) return null

  return {
    ...balance,
    account_id: accountId,
    account_balance: toNumericBalance(balance.account_balance) ?? undefined,
    cash_on_hand: toNumericBalance(balance.cash_on_hand) ?? undefined,
    margin_balance: toNumericBalance(balance.margin_balance) ?? undefined,
    available_buying_power:
      toNumericBalance(balance.available_buying_power) ?? undefined,
    open_pnl: toNumericBalance(balance.open_pnl) ?? undefined,
    closed_pnl: toNumericBalance(balance.closed_pnl) ?? undefined,
  }
}
