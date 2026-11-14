import { jsonError } from '@/lib/api/json-error'
import { authorizeAdminRequest } from '@/lib/admin/auth'
import { retryPendingAccountCleanups } from '@/server/account-deletion/pending-cleanup'

/**
 * Admin-only retry for PendingAccountCleanup rows.
 * Auth: admin session or `Authorization: Bearer $CRON_SECRET`.
 *
 * Body (optional JSON): `{ "id"?: string, "dryRun"?: boolean }`
 */
export async function POST(request: Request) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) {
    return jsonError({
      code: auth.status === 401 ? 'unauthorized' : 'forbidden',
      message:
        auth.status === 401
          ? 'Admin authentication required.'
          : 'Admin access required.',
      hint:
        auth.status === 401
          ? 'Sign in as an admin or send Authorization: Bearer $CRON_SECRET.'
          : 'Use an allowlisted admin user id.',
      request,
    })
  }

  let id: string | undefined
  let dryRun = false
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = (await request.json()) as {
        id?: unknown
        dryRun?: unknown
      }
      if (typeof body.id === 'string' && body.id.trim()) id = body.id.trim()
      dryRun = body.dryRun === true
    }
  } catch {
    return jsonError({
      code: 'bad_request',
      message: 'Invalid JSON body.',
      hint: 'Send JSON with optional id and dryRun fields.',
      request,
    })
  }

  const results = await retryPendingAccountCleanups({ id, dryRun })
  return Response.json({ results })
}
