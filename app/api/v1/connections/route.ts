import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { getConnectionsForUser } from "@/server/connections"
import {
  createServerSyncableConnection,
  type CreateConnectionBody,
} from "@/lib/api/connection-services"

export const maxDuration = 300

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

  let body: CreateConnectionBody
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON")
  }

  return createServerSyncableConnection(auth.auth.userId, body)
}
