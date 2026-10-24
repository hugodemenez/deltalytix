import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { readAccounts } from "@/lib/api/v1/reads"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["accounts:read"])
  if (!auth.ok) return auth.response

  const includeMetrics =
    new URL(request.url).searchParams.get("includeMetrics") === "true"

  return NextResponse.json(
    await readAccounts(auth.auth.userId, { includeMetrics }),
  )
}

export const GET = withPublicApiRequestLog(getHandler)
