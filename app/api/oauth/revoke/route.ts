import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sha256 } from "@/lib/api/tokens"

async function readBody(request: NextRequest): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(json)) {
      if (value != null) out[key] = String(value)
    }
    return out
  }
  const form = await request.formData()
  const out: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === "string") out[key] = value
  })
  return out
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request)
    const { token, client_id, client_secret } = body

    if (token && client_id) {
      const app = await prisma.oAuthApp.findUnique({ where: { clientId: client_id } })
      if (app && (!client_secret || sha256(client_secret) === app.clientSecretHash)) {
        const hash = sha256(token)
        await prisma.oAuthAccessToken.updateMany({
          where: {
            appId: app.id,
            OR: [{ tokenHash: hash }, { refreshTokenHash: hash }],
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        })
      }
    }
  } catch (error) {
    console.error("[oauth/revoke]", error)
  }

  return new NextResponse(null, { status: 200 })
}
