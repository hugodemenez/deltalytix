import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
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
    return NextResponse.json(
      { error: "not_found", message: "User not found" },
      { status: 404 },
    )
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    language: user.language,
  })
}
