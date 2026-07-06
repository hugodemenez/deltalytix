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

export const DEFAULT_RITHMIC_API_HOST = "api-beta.deltalytix.app"

export function getRithmicApiHost(): string {
  const configured = process.env.NEXT_PUBLIC_RITHMIC_API_URL?.trim()
  if (!configured) return DEFAULT_RITHMIC_API_HOST
  return configured.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

export function isLocalRithmicApiHost(host = getRithmicApiHost()): boolean {
  return host.includes("localhost")
}

export function getRithmicProtocols(host = getRithmicApiHost()) {
  const isLocalhost = isLocalRithmicApiHost(host)
  if (typeof window === "undefined") {
    return { http: "https:", ws: "wss:" as const }
  }
  return {
    http: isLocalhost ? window.location.protocol : "https:",
    ws: isLocalhost
      ? window.location.protocol === "https:"
        ? ("wss:" as const)
        : ("ws:" as const)
      : ("wss:" as const),
  }
}

export function getRithmicApiBaseUrl(): string {
  const host = getRithmicApiHost()
  const { http } = getRithmicProtocols(host)
  return `${http}//${host}`
}

export function resolveRithmicWebSocketUrl(baseUrl: string): string {
  const { ws } = getRithmicProtocols()
  return baseUrl.replace("ws://your-domain", `${ws}//${getRithmicApiHost()}`)
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
