export const DASHBOARD_SUBPAGES = ["connections", "data", "settings"] as const

export type DashboardSubpage = (typeof DASHBOARD_SUBPAGES)[number]

function dashboardSegments(pathname: string): string[] | null {
  const parts = pathname.split("/").filter(Boolean)
  const dashboardIndex = parts.indexOf("dashboard")
  if (dashboardIndex === -1) return null
  // Team dashboards are a different shell — never treat them as app home.
  if (dashboardIndex > 0 && parts[dashboardIndex - 1] === "teams") {
    return null
  }
  return parts.slice(dashboardIndex + 1)
}

export function isDashboardHomePath(pathname: string): boolean {
  const rest = dashboardSegments(pathname)
  return rest !== null && rest.length === 0
}

export function resolveDashboardSubpage(
  pathname: string
): DashboardSubpage | null {
  const rest = dashboardSegments(pathname)
  if (rest?.length !== 1) return null
  const segment = rest[0]
  return DASHBOARD_SUBPAGES.includes(segment as DashboardSubpage)
    ? (segment as DashboardSubpage)
    : null
}
