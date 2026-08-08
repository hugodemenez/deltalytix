import { connection } from "next/server"
import { NextResponse, type NextRequest } from "next/server"
import { buildOpenApiDocument } from "@/lib/api/openapi"

export async function GET(request: NextRequest) {
  await connection()

  return NextResponse.json(buildOpenApiDocument(request), {
    headers: {
      "Content-Type": "application/vnd.oai.openapi+json; charset=utf-8",
    },
  })
}
