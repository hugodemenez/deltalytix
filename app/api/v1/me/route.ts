import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { apiError } from "@/lib/api/errors"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"
import { prisma } from "@/lib/prisma"

async function getHandler(request: NextRequest) {
  const auth = await authenticateApiRequest(request, ["profile:read"])
  if (!auth.ok) return auth.response

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: auth.auth.userId }, { auth_user_id: auth.auth.userId }],
    },
    select: {
      id: true,
      email: true,
      language: true,
    },
  })

  if (!user) {
    return apiError(404, "not_found", "User not found")
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    language: user.language,
  })
}

export const GET = withPublicApiRequestLog(getHandler)
