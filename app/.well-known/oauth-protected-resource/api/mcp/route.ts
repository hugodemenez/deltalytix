import { NextRequest, NextResponse } from "next/server"
import { buildMcpProtectedResourceMetadata } from "@/lib/mcp/protected-resource"

export function GET(request: NextRequest) {
  return NextResponse.json(buildMcpProtectedResourceMetadata(request), {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  })
}
