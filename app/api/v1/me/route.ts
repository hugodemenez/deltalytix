import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { readProfile } from "@/lib/api/v1/reads"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["profile:read"])
  if (!auth.ok) return auth.response

  const user = await readProfile(auth.auth.userId)
  if (!user) {
    return apiError(404, "not_found", "User not found")
  }

  return NextResponse.json(user)
}

export const GET = withPublicApiRequestLog(getHandler)
