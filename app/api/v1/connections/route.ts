import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { getConnectionsForUser } from "@/server/connections"
import { connectIbkrFlexAccount } from "@/app/[locale]/dashboard/components/import/ibkr/sync/actions"
import { prisma } from "@/lib/prisma"

function serializeConnection(
  connection: Awaited<ReturnType<typeof getConnectionsForUser>>[number],
) {
  return {
    id: connection.id,
    service: connection.service,
    externalId: connection.externalId,
    lastSyncedAt: connection.lastSyncedAt.toISOString(),
    environment: connection.environment,
    accountNumbers: connection.accounts.map((a) => a.number),
    createdAt: connection.createdAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["connections:read"])
  if (!auth.ok) return auth.response

  const connections = await getConnectionsForUser(auth.auth.userId)
  return NextResponse.json({
    data: connections.map(serializeConnection),
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["connections:write"])
  if (!auth.ok) return auth.response

  let body: { service?: string; token?: string; queryId?: string }
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON")
  }

  const service = body.service?.toLowerCase()
  if (service !== "ibkr") {
    return apiError(422, "unsupported_service", "Only IBKR Flex is supported in v1", {
      supported: ["ibkr"],
    })
  }

  if (!body.token || !body.queryId) {
    return apiError(
      400,
      "validation_error",
      "token and queryId are required for IBKR Flex connections",
    )
  }

  const result = await connectIbkrFlexAccount(
    `token=${body.token}\nqueryId=${body.queryId}`,
    { userId: auth.auth.userId },
  )

  if (!result.success) {
    return apiError(
      400,
      "connection_failed",
      result.error || "Failed to connect IBKR Flex account",
      result.errorParams,
    )
  }

  const connection = await prisma.connection.findUnique({
    where: {
      userId_service_externalId: {
        userId: auth.auth.userId,
        service: "ibkr",
        externalId: result.accountId!,
      },
    },
    include: {
      accounts: {
        select: { number: true },
      },
    },
  })

  return NextResponse.json(
    {
      id: connection?.id,
      service: "ibkr",
      externalId: result.accountId,
      imported: result.savedCount ?? 0,
      duplicates:
        (result.tradesCount ?? 0) - (result.savedCount ?? 0),
      accountNumbers: connection?.accounts.map((a) => a.number) ?? [],
      stats: result.stats,
    },
    { status: 201 },
  )
}
