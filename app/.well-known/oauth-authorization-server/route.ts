import { NextRequest, NextResponse } from "next/server"
import { buildOAuthAuthorizationServerMetadata } from "@/lib/agent-discovery/oauth-server-metadata"

export function GET(request: NextRequest) {
  return NextResponse.json(buildOAuthAuthorizationServerMetadata(request), {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  })
}
