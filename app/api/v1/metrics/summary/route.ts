import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { readMetricsSummary } from "@/lib/api/v1/reads"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["metrics:read"])
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const result = await readMetricsSummary(auth.auth.userId, {
    accountNumber: searchParams.get("accountNumber") || undefined,
    instrument: searchParams.get("instrument") || undefined,
    side: searchParams.get("side") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  })
  if (!result.ok) {
    return apiError(400, "validation_error", result.message)
  }

  return NextResponse.json(result.data)
}

export const GET = withPublicApiRequestLog(getHandler)
