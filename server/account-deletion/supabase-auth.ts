import 'server-only'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { prisma } from '@/lib/prisma'

export type AuthEmailLookup = 'match' | 'none' | 'unknown'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    throw new Error('Unable to reach Supabase auth admin')
  }
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function deleteSupabaseAuthUser(authUserId: string): Promise<void> {
  if (isLocalDashboardAuthBypassEnabled()) return

  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(authUserId)
  if (error) {
    throw new Error(error.message)
  }
}

/** True when a Supabase auth user still exists for this id. */
export async function supabaseAuthUserExists(
  authUserId: string,
): Promise<boolean> {
  if (isLocalDashboardAuthBypassEnabled()) return false
  try {
    const admin = adminClient()
    const { data, error } = await admin.auth.admin.getUserById(authUserId)
    if (error) {
      if (/user not found|not found/i.test(error.message)) return false
      console.error('[delete-account] auth existence check failed:', error.message)
      // Fail closed: treat as present so we refuse to touch storage.
      return true
    }
    return Boolean(data.user)
  } catch (error) {
    console.error('[delete-account] auth existence check threw:', error)
    return true
  }
}

/**
 * Direct lookup of auth.users by lower(email) via the app DB connection.
 * Returns tri-state so callers can keep queue rows when the lookup is unknown.
 */
export async function lookupSupabaseAuthEmail(
  email: string,
): Promise<AuthEmailLookup> {
  if (isLocalDashboardAuthBypassEnabled()) return 'none'
  const normalized = email.trim().toLowerCase()
  if (!normalized) return 'none'

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id
      FROM auth.users
      WHERE lower(email) = ${normalized}
      LIMIT 1
    `
    return rows.length > 0 ? 'match' : 'none'
  } catch (error) {
    console.error(
      '[delete-account] auth email lookup failed:',
      error instanceof Error ? error.message : error,
    )
    return 'unknown'
  }
}
