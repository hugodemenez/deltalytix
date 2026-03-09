const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"])

function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  return TRUTHY_VALUES.has(value.toLowerCase())
}

export function isLocalDashboardAuthBypassEnabled(): boolean {
  return (
    isTruthy(process.env.LOCAL_DASHBOARD_AUTH_BYPASS) ||
    isTruthy(process.env.NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS)
  )
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

