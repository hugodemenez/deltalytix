import 'server-only'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'

export async function deleteSupabaseAuthUser(authUserId: string): Promise<void> {
  if (isLocalDashboardAuthBypassEnabled()) return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    throw new Error('Unable to delete the auth user')
  }

  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await admin.auth.admin.deleteUser(authUserId)
  if (error) {
    throw new Error(error.message)
  }
}
