import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { readEquity } from "@/lib/api/v1/reads"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["metrics:read"])
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const accountNumbersParam = searchParams.get("accountNumbers")
  const accountNumbers = accountNumbersParam
    ? accountNumbersParam.split(",").map((value) => value.trim()).filter(Boolean)
    : []

  return NextResponse.json(
    await readEquity(auth.auth.userId, {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      accountNumbers,
      showIndividual: searchParams.get("showIndividual") === "true",
    }),
  )
}

export const GET = withPublicApiRequestLog(getHandler)
