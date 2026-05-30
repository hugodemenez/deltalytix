import type { User } from "@supabase/supabase-js"

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"])

function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  return TRUTHY_VALUES.has(value.toLowerCase())
}

function isBypassRequestedFromEnv(): boolean {
  return (
    isTruthy(process.env.LOCAL_DASHBOARD_AUTH_BYPASS) ||
    isTruthy(process.env.NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS)
  )
}

function assertBypassAllowedInCurrentEnvironment(): void {
  if (process.env.NODE_ENV !== "production") {
    return
  }

  if (isTruthy(process.env.LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION)) {
    return
  }

  throw new Error(
    "LOCAL_DASHBOARD_AUTH_BYPASS is not allowed when NODE_ENV=production. " +
      "Unset bypass env vars or set LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1 only for intentional testing.",
  )
}

export function isLocalDashboardAuthBypassEnabled(): boolean {
  if (!isBypassRequestedFromEnv()) {
    return false
  }

  assertBypassAllowedInCurrentEnvironment()
  return true
}

export function getLocalDashboardUserId(): string {
  return (
    process.env.LOCAL_DASHBOARD_USER_ID ||
    process.env.NEXT_PUBLIC_LOCAL_DASHBOARD_USER_ID ||
    "local-dashboard-user"
  )
}

export function getLocalDashboardUserEmail(): string {
  return (
    process.env.LOCAL_DASHBOARD_USER_EMAIL ||
    process.env.NEXT_PUBLIC_LOCAL_DASHBOARD_USER_EMAIL ||
    "local-dashboard@deltalytix.local"
  )
}

export function buildLocalDashboardBypassUser(): User {
  const localUserId = getLocalDashboardUserId()
  const localUserEmail = getLocalDashboardUserEmail()
  const nowIso = new Date().toISOString()

  return {
    id: localUserId,
    email: localUserEmail,
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: nowIso,
    phone: "",
    confirmed_at: nowIso,
    app_metadata: {
      provider: "local-dashboard-bypass",
      providers: ["local-dashboard-bypass"],
    },
    user_metadata: {},
    identities: [],
    created_at: nowIso,
    updated_at: nowIso,
    is_anonymous: false,
  } as User
}
