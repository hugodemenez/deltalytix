import type { NextRequest } from "next/server"
import { dispatchMcp } from "@/lib/mcp/http"
import { withPublicApiRequestLog } from "@/lib/api/with-request-log"

export const maxDuration = 60

async function handler(request: NextRequest) {
  return dispatchMcp(request)
}

const logged = withPublicApiRequestLog(handler)

export const GET = logged
export const POST = logged
export const DELETE = logged
export const OPTIONS = logged
