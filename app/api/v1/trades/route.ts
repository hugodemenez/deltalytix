import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import {
  buildTradeWhere,
  decodeCursor,
  encodeCursor,
  invalidDateFilter,
  parseLimit,
  serializeTrade,
} from "@/lib/api/pagination"
import { prisma } from "@/lib/prisma"
import {
  normalizeTradeInput,
  saveTradesCore,
} from "@/lib/trades/save-trades-core"
import type { Trade } from "@/prisma/generated/prisma/client"

const MAX_TRADES_PER_REQUEST = 5000

const NUMERIC_FIELDS = [
  "quantity",
  "entryPrice",
  "closePrice",
  "pnl",
  "commission",
  "timeInPosition",
] as const

function invalidTradeFields(
  trade: Record<string, unknown>,
  index: number,
): { field: string; message: string }[] {
  const details: { field: string; message: string }[] = []
  for (const field of NUMERIC_FIELDS) {
    const value = trade[field]
    if (value == null) continue
    if (typeof value === "boolean" || !Number.isFinite(Number(value))) {
      details.push({ field: `trades[${index}].${field}`, message: "must be a number" })
    }
  }
  for (const field of ["entryDate", "closeDate"] as const) {
    const value = trade[field]
    if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
      details.push({ field: `trades[${index}].${field}`, message: "must be an ISO 8601 date" })
    }
  }
  return details
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["trades:read"])
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const badDate = invalidDateFilter(searchParams)
  if (badDate) {
    return apiError(400, "validation_error", `${badDate} must be an ISO 8601 date`)
  }
  const limit = parseLimit(searchParams.get("limit"))
  const offset = decodeCursor(searchParams.get("cursor"))
  const where = buildTradeWhere(auth.auth.userId, {
    accountNumber: searchParams.get("accountNumber") || undefined,
    instrument: searchParams.get("instrument") || undefined,
    side: searchParams.get("side") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  })

  const trades = await prisma.trade.findMany({
    where,
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    skip: offset,
    take: limit + 1,
  })

  const hasMore = trades.length > limit
  const page = hasMore ? trades.slice(0, limit) : trades

  return NextResponse.json({
    data: page.map(serializeTrade),
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["trades:write"])
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON")
  }

  const tradesInput = (body as { trades?: unknown })?.trades
  if (!Array.isArray(tradesInput) || tradesInput.length === 0) {
    return apiError(400, "validation_error", "Body must include a non-empty trades array")
  }
  if (tradesInput.length > MAX_TRADES_PER_REQUEST) {
    return apiError(
      400,
      "validation_error",
      `At most ${MAX_TRADES_PER_REQUEST} trades can be sent per request`,
    )
  }

  for (const [index, trade] of tradesInput.entries()) {
    if (!trade || typeof trade !== "object") {
      return apiError(400, "validation_error", "Each trade must be an object")
    }
    const t = trade as Record<string, unknown>
    if (
      !t.accountNumber ||
      !t.instrument ||
      t.quantity == null ||
      t.entryPrice == null ||
      t.closePrice == null ||
      !t.entryDate ||
      !t.closeDate ||
      t.pnl == null
    ) {
      return apiError(
        400,
        "validation_error",
        "Each trade requires accountNumber, instrument, quantity, entryPrice, closePrice, entryDate, closeDate, and pnl",
      )
    }

    // `Number("1,234.50")` is NaN, which would land in the float columns and
    // turn every later metric into NaN; reject it here instead.
    const details = invalidTradeFields(t, index)
    if (details.length > 0) {
      return apiError(400, "validation_error", "Invalid trade data", details)
    }
  }

  const normalized = tradesInput.map((trade) =>
    normalizeTradeInput(trade as Record<string, unknown>, auth.auth.userId),
  ) as Trade[]

  const result = await saveTradesCore(normalized, { userId: auth.auth.userId })

  if (result.error === "DATABASE_ERROR") {
    return apiError(500, "database_error", "Failed to save trades", result.details)
  }

  if (result.error === "INVALID_DATA") {
    return apiError(400, "validation_error", "Invalid trade data", result.details)
  }

  const imported = result.numberOfTradesAdded
  const total = normalized.length
  const duplicates = total - imported

  return NextResponse.json(
    {
      imported,
      duplicates,
      total,
      error:
        result.error === "DUPLICATE_TRADES"
          ? "duplicate_trades"
          : result.error === "NO_TRADES_ADDED"
            ? "no_trades_added"
            : undefined,
    },
    { status: 201 },
  )
}
