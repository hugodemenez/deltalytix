import { headers } from "next/headers"
import { getUserId } from "@/server/auth"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"

/**
 * Resolve the user id for a server action that may also be invoked by cron.
 *
 * - With a session: always use the session user; a mismatched requested id is refused.
 * - Without a session: only allow a requested id when the inbound request carries a
 *   valid cron Authorization header (as `/api/cron/daily-sync` does).
 */
export async function resolveActionUserId(
  requestedUserId?: string | null,
): Promise<string> {
  let sessionUserId: string | null = null
  try {
    sessionUserId = await getUserId()
  } catch {
    sessionUserId = null
  }

  if (sessionUserId) {
    if (requestedUserId && requestedUserId !== sessionUserId) {
      throw new Error("Unauthorized")
    }
    return sessionUserId
  }

  const headersList = await headers()
  if (
    !isAuthorizedCronRequest(headersList.get("authorization")) ||
    !requestedUserId
  ) {
    throw new Error("Unauthorized")
  }

  return requestedUserId
}
