export interface DeepchartsImportedTrade {
  instrument: string
  quantity: number
  side: "long" | "short"
  entryPrice: string
  closePrice: string
  entryDate: string
  closeDate: string
  pnl: number
  commission: number
  timeInPosition: number
}

export type DeepchartsImportErrorCode = "missing-columns"

export class DeepchartsImportError extends Error {
  constructor(
    public readonly code: DeepchartsImportErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "DeepchartsImportError"
  }
}

const REQUIRED_HEADERS = [
  "Symbol",
  "Quantity",
  "Entry DT",
  "Entry Price",
  "Exit DT",
  "Exit Price",
] as const

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim()
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  return new Map(
    headers.map((header, index) => [
      normalizeHeader(header).toLowerCase(),
      index,
    ]),
  )
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined
  const parsed = Number(value.trim().replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Parse DeepCharts naive datetimes (`YYYY-MM-DD HH:MM:SS[.mmm]`) as written.
 * No exchange timezone is applied — the wall-clock is stored as UTC, matching
 * other closed-trade CSV imports that do not receive a zone from the file.
 */
export function parseDeepchartsDateTime(
  value: string | undefined,
): string | undefined {
  if (!value?.trim()) return undefined

  const trimmed = value.trim()
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  )

  if (match) {
    const [, year, month, day, hours, minutes, seconds, millis] = match
    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
        millis ? Number(millis.padEnd(3, "0")) : 0,
      ),
    )
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function parseDeepchartsTradeList(
  headers: string[],
  rows: string[][],
): { trades: DeepchartsImportedTrade[] } {
  const headerIndex = buildHeaderIndex(headers)
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerIndex.has(header.toLowerCase()),
  )
  if (missingHeaders.length > 0) {
    throw new DeepchartsImportError(
      "missing-columns",
      `Missing DeepCharts columns: ${missingHeaders.join(", ")}`,
    )
  }

  const get = (row: string[], header: string) => {
    const index = headerIndex.get(header.toLowerCase())
    return index === undefined ? undefined : row[index]?.trim()
  }

  const trades: DeepchartsImportedTrade[] = []

  for (const row of rows) {
    if (!row.some((cell) => cell?.trim())) continue

    const instrument = get(row, "Symbol") || ""
    const signedQuantity = parseNumber(get(row, "Quantity"))
    const entryPrice = parseNumber(get(row, "Entry Price"))
    const closePrice = parseNumber(get(row, "Exit Price"))
    const entryDate = parseDeepchartsDateTime(get(row, "Entry DT"))
    const closeDate = parseDeepchartsDateTime(get(row, "Exit DT"))
    const pnl = parseNumber(get(row, "ProfitLoss"))

    if (
      !instrument ||
      signedQuantity === undefined ||
      signedQuantity === 0 ||
      entryPrice === undefined ||
      closePrice === undefined ||
      !entryDate ||
      !closeDate ||
      pnl === undefined
    ) {
      continue
    }

    trades.push({
      instrument,
      quantity: Math.abs(signedQuantity),
      side: signedQuantity > 0 ? "long" : "short",
      entryPrice: entryPrice.toString(),
      closePrice: closePrice.toString(),
      entryDate,
      closeDate,
      pnl,
      commission: 0,
      timeInPosition:
        (new Date(closeDate).getTime() - new Date(entryDate).getTime()) / 1000,
    })
  }

  return { trades }
}
