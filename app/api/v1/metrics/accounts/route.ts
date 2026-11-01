import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { readAccountMetrics } from "@/lib/api/v1/reads"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["metrics:read"])
  if (!auth.ok) return auth.response

  return NextResponse.json(await readAccountMetrics(auth.auth.userId))
}

export const GET = withPublicApiRequestLog(getHandler)
