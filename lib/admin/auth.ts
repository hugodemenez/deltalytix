/**
 * Platform-admin gate used by `/admin` pages and admin API routes.
 *
 * Allowlist (any match is enough):
 * - `ADMIN_USER_ID` — same env `proxy.ts` uses for `/admin`
 * - `ALLOWED_ADMIN_USER_ID` — weekly-recap target fallback
 * - `ADMIN_USER_IDS` — comma-separated extra ids
 *
 * Cron scripts may also send `Authorization: Bearer $CRON_SECRET` (the same
 * header `/api/cron/daily-sync` already checks). That secret can now invoke
 * the Protocol account rebuild; treat it as operator-only. An empty or
 * whitespace-only `CRON_SECRET` never matches.
 */
import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { getUserId } from '@/server/auth'

function secretsEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  if (a.length !== b.length) {
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

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
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return false
  return secretsEqual(secret, header.slice('Bearer '.length))
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
