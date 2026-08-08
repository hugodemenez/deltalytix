import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { prisma } from "@/lib/prisma"
import { syncIbkrAccount } from "@/app/[locale]/dashboard/components/import/ibkr/sync/actions"

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(request, ["connections:write"])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const connection = await prisma.connection.findFirst({
    where: { id, userId: auth.auth.userId },
  })

  if (!connection) {
    return apiError(404, "not_found", "Connection not found")
  }

  const syncable = ["ibkr"]
  if (!syncable.includes(connection.service)) {
    return apiError(
      422,
      "unsupported_service",
      `Sync is not available for service "${connection.service}"`,
      { supported: syncable },
    )
  }

  const result = await syncIbkrAccount(connection.externalId, {
    userId: auth.auth.userId,
  })

  if (result.error && result.savedCount == null && !result.stats) {
    return apiError(
      400,
      "sync_failed",
      result.error,
      result.errorParams,
    )
  }

  const imported = result.savedCount ?? 0
  const total = result.tradesCount ?? imported
  return NextResponse.json({
    status: "completed",
    imported,
    duplicates: Math.max(0, total - imported),
    warning: result.error || undefined,
    stats: result.stats,
  })
}
