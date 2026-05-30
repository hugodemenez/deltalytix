import type { SupabaseClient } from "@supabase/supabase-js"

import {
  buildLocalDashboardBypassUser,
} from "@/lib/local-dashboard-auth"

const STORAGE_UNAVAILABLE_ERROR =
  "Supabase storage is unavailable in local dashboard auth bypass mode."

export function createLocalDashboardBypassStorageStub() {
  return {
    from() {
      return {
        async upload() {
          return {
            data: null,
            error: new Error(STORAGE_UNAVAILABLE_ERROR),
          }
        },
        async remove() {
          return {
            data: null,
            error: new Error(STORAGE_UNAVAILABLE_ERROR),
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: path } }
        },
      }
    },
  }
}

export function createLocalDashboardBypassAuthStub() {
  const localUser = buildLocalDashboardBypassUser()

  return {
    async getUser() {
      return { data: { user: localUser }, error: null }
    },
    async signOut() {
      return { error: null }
    },
    async getSession() {
      return {
        data: {
          session: {
            user: localUser,
            access_token: "local-dashboard-bypass",
            refresh_token: "local-dashboard-bypass",
            expires_in: 60 * 60 * 24 * 365,
            token_type: "bearer",
          },
        },
        error: null,
      }
    },
    onAuthStateChange(callback: (event: string, session: { user: typeof localUser } | null) => void) {
      callback("SIGNED_IN", { user: localUser })
      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }
    },
  }
}

export function createLocalDashboardBypassSupabaseClient(): SupabaseClient {
  return {
    auth: createLocalDashboardBypassAuthStub(),
    storage: createLocalDashboardBypassStorageStub(),
  } as unknown as SupabaseClient
}
