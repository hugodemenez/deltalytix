import { describe, expect, it } from "vitest"

import {
  isDashboardHomePath,
  resolveDashboardSubpage,
} from "./dashboard-subpage"

describe("resolveDashboardSubpage", () => {
  it.each([
    ["/dashboard/connections", "connections"],
    ["/en/dashboard/data", "data"],
    ["/fr/dashboard/settings/", "settings"],
    ["/dashboard/settings", "settings"],
    ["/dashboard/billing", "billing"],
    ["/en/dashboard/billing", "billing"],
  ] as const)("reads %s as %s", (pathname, subpage) => {
    expect(resolveDashboardSubpage(pathname)).toBe(subpage)
  })

  it.each([
    "/dashboard",
    "/en/dashboard",
    "/dashboard/",
    "/dashboard/import",
    "/en/teams/dashboard",
    "/en/teams/dashboard/settings",
  ])("ignores %s", (pathname) => {
    expect(resolveDashboardSubpage(pathname)).toBeNull()
  })
})

describe("isDashboardHomePath", () => {
  it.each(["/dashboard", "/en/dashboard", "/fr/dashboard/"])(
    "treats %s as home",
    (pathname) => {
      expect(isDashboardHomePath(pathname)).toBe(true)
    }
  )

  it.each([
    "/dashboard/connections",
    "/en/dashboard/settings",
    "/dashboard/billing",
    "/en/teams/dashboard",
  ])("does not treat %s as home", (pathname) => {
    expect(isDashboardHomePath(pathname)).toBe(false)
  })
})
