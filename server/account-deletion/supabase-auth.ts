import 'server-only'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'

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
