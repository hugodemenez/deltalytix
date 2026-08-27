import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { aiNormalizeTrades } from "@/lib/api/ai-import"
import {
  getPlatformParser,
  SUPPORTED_IMPORT_PLATFORMS,
} from "@/lib/import-parsers"
import { parseTabularFile } from "@/lib/import-parsers/parse-file"
import { saveTradesCore } from "@/lib/trades/save-trades-core"
import type { Trade } from "@/prisma/generated/prisma/client"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["imports:write"])
  if (!auth.ok) return auth.response

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return apiError(400, "invalid_multipart", "Expected multipart/form-data body")
  }

  const file = form.get("file")
  const type = String(form.get("type") || "")
  const accountNumber = String(form.get("accountNumber") || "")

  if (!(file instanceof File)) {
    return apiError(400, "validation_error", "file is required")
  }
  if (!accountNumber) {
    return apiError(400, "validation_error", "accountNumber is required")
  }
  if (!type) {
    return apiError(400, "validation_error", "type is required")
  }

  const filename = file.name || "upload.csv"
  const lower = filename.toLowerCase()
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return apiError(400, "validation_error", "file must be .csv or .xlsx")
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let parsed
  try {
    parsed = await parseTabularFile(buffer, filename)
  } catch (error) {
    return apiError(
      400,
      "parse_error",
      "Failed to parse uploaded file",
      error instanceof Error ? error.message : String(error),
    )
  }

  let trades: Trade[] = []

  if (type === "ai") {
    try {
      trades = await aiNormalizeTrades({
        headers: parsed.headers,
        objects: parsed.objects,
        accountNumber,
      })
    } catch (error) {
      return apiError(
        502,
        "ai_import_failed",
        "AI import failed to normalize trades",
        error instanceof Error ? error.message : String(error),
      )
    }
  } else {
    const parser = getPlatformParser(type)
    if (!parser) {
      return apiError(
        422,
        "unsupported_platform",
        `Import type "${type}" is not supported`,
        { supported: ["ai", ...SUPPORTED_IMPORT_PLATFORMS] },
      )
    }
    trades = parser(parsed.headers, parsed.rows, accountNumber).map((trade) => ({
      ...trade,
      accountNumber: trade.accountNumber || accountNumber,
      userId: auth.auth.userId,
    }))
  }

  if (trades.length === 0) {
    return NextResponse.json({
      imported: 0,
      duplicates: 0,
      total: 0,
      accountNumber,
    })
  }

  const result = await saveTradesCore(trades, { userId: auth.auth.userId })
  if (result.error === "DATABASE_ERROR") {
    return apiError(500, "database_error", "Failed to save imported trades", result.details)
  }

  const imported = result.numberOfTradesAdded
  const total = trades.length
  return NextResponse.json({
    imported,
    duplicates: total - imported,
    total,
    accountNumber,
  })
}
