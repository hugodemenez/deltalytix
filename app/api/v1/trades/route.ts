import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import {
  buildTradeWhere,
  decodeCursor,
  encodeCursor,
  parseLimit,
  serializeTrade,
} from "@/lib/api/pagination"
import { prisma } from "@/lib/prisma"
import {
  normalizeTradeInput,
  saveTradesCore,
} from "@/lib/trades/save-trades-core"
import type { Trade } from "@/prisma/generated/prisma/client"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["trades:read"])
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
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

  for (const trade of tradesInput) {
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
