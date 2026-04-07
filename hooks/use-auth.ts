'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getLocalDashboardUserEmail,
  getLocalDashboardUserId,
  isLocalDashboardAuthBypassEnabled,
} from '@/lib/local-dashboard-auth'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (isLocalDashboardAuthBypassEnabled()) {
    const nowIso = new Date().toISOString()
    return {
      auth: {
        async getUser() {
          return {
            data: {
              user: {
                id: getLocalDashboardUserId(),
                email: getLocalDashboardUserEmail(),
                user_metadata: {},
                app_metadata: {
                  provider: 'local-dashboard-bypass',
                  providers: ['local-dashboard-bypass'],
                },
                aud: 'authenticated',
                role: 'authenticated',
                created_at: nowIso,
                updated_at: nowIso,
              },
            },
            error: null,
          }
        },
      },
    } as unknown as SupabaseClient
  }

  return createBrowserClient(
    url!,
    anonKey!
  )
}