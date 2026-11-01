import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { readConnections } from "@/lib/api/v1/reads"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"
import {
  createServerSyncableConnection,
  type CreateConnectionBody,
} from "@/lib/api/connection-services"

export const maxDuration = 300

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["connections:read"])
  if (!auth.ok) return auth.response

  return NextResponse.json(await readConnections(auth.auth.userId))
}

async function postHandler(request: NextRequest) {
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

export const GET = withPublicApiRequestLog(getHandler)
export const POST = withPublicApiRequestLog(postHandler)
