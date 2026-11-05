/**
 * Platform-admin gate used by `/admin` pages and admin API routes.
 *
 * Allowlist (any match is enough):
 * - `ADMIN_USER_ID` — same env `proxy.ts` uses for `/admin`
 * - `ALLOWED_ADMIN_USER_ID` — weekly-recap target fallback
 * - `ADMIN_USER_IDS` — comma-separated extra ids
 *
 * Cron scripts may also send `Authorization: Bearer $CRON_SECRET` (the same
 * header `/api/cron/daily-sync` already checks). An empty `CRON_SECRET` never
 * matches.
 */
import { getUserId } from '@/server/auth'

export function adminUserIdsFromEnv(): string[] {
  const ids = [
    process.env.ADMIN_USER_ID,
    process.env.ALLOWED_ADMIN_USER_ID,
    ...(process.env.ADMIN_USER_IDS ?? '').split(','),
  ]
  return [...new Set(ids.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))]
}

export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false
  return adminUserIdsFromEnv().includes(userId)
}

export function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export type AdminAuthorization =
  | { ok: true; via: 'session' | 'cron'; actorUserId?: string }
  | { ok: false; status: 401 | 403 }

export async function authorizeAdminRequest(
  request: Request,
): Promise<AdminAuthorization> {
  if (hasCronSecret(request)) {
    return { ok: true, via: 'cron' }
  }

  let userId: string | null = null
  try {
    userId = await getUserId()
  } catch {
    userId = null
  }

  if (!userId) {
    return { ok: false, status: 401 }
  }
  if (!isAdminUserId(userId)) {
    return { ok: false, status: 403 }
  }
  return { ok: true, via: 'session', actorUserId: userId }
}
