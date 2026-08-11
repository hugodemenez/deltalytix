import { NextRequest } from "next/server"
import { authenticateApiRequest } from "@/lib/api/auth"
import { syncServerSyncableConnection } from "@/lib/api/connection-services"

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(request, ["connections:write"])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  return syncServerSyncableConnection(auth.auth.userId, id)
}
