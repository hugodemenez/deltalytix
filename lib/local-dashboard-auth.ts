import type { User } from "@supabase/supabase-js"

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"])

const isServer = typeof window === "undefined"

function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  return TRUTHY_VALUES.has(value.trim().toLowerCase())
}

function isBypassRequestedFromEnv(): boolean {
  if (isServer) {
    return isTruthy(process.env.LOCAL_DASHBOARD_AUTH_BYPASS)
  }

  return isTruthy(process.env.NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS)
}

/** Vercel (and similar) hosted deployments — never treat as local self-host. */
function isHostedCloudDeployment(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.CF_PAGES ||
      process.env.NETLIFY,
  )
}

function assertBypassAllowedInCurrentEnvironment(): void {
  if (isTruthy(process.env.LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION)) {
    return
  }

  if (process.env.NODE_ENV === "production" || isHostedCloudDeployment()) {
    throw new Error(
      "LOCAL_DASHBOARD_AUTH_BYPASS is not allowed on production or hosted deployments. " +
        "Unset bypass env vars, or set LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION=1 only for intentional isolated testing.",
    )
  }
}

export function isLocalDashboardAuthBypassEnabled(): boolean {
  if (!isBypassRequestedFromEnv()) {
    return false
  }

  // Client bundles: never activate the auth stub in production builds, even if
  // NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS was baked in. Server bypass remains
  // separately gated via LOCAL_DASHBOARD_AUTH_BYPASS (+ ALLOW_PRODUCTION).
  if (!isServer) {
    return process.env.NODE_ENV !== "production"
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
