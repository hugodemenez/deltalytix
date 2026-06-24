import { createBrowserClient } from '@supabase/ssr'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { createLocalDashboardBypassSupabaseClient } from '@/lib/local-dashboard-bypass-client'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (isLocalDashboardAuthBypassEnabled()) {
    return createLocalDashboardBypassSupabaseClient()
  }

  return createBrowserClient(
    url!,
    anonKey!
  )
}
