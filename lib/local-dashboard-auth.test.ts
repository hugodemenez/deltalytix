import { afterEach, describe, expect, it, vi } from "vitest"
import { isLocalDashboardAuthBypassEnabled } from "./local-dashboard-auth"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("isLocalDashboardAuthBypassEnabled", () => {
  it("is off when bypass env is unset", () => {
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS", "")
    vi.stubEnv("NEXT_PUBLIC_LOCAL_DASHBOARD_AUTH_BYPASS", "")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("VERCEL", "")
    vi.stubEnv("VERCEL_ENV", "")

    expect(isLocalDashboardAuthBypassEnabled()).toBe(false)
  })

  it("allows bypass in local development", () => {
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS", "true")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("VERCEL", "")
    vi.stubEnv("VERCEL_ENV", "")
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION", "")

    expect(isLocalDashboardAuthBypassEnabled()).toBe(true)
  })

  it("refuses bypass on Vercel without ALLOW_PRODUCTION", () => {
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS", "true")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("VERCEL", "1")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION", "")

    expect(() => isLocalDashboardAuthBypassEnabled()).toThrow(/not allowed/)
  })

  it("allows bypass on production only with ALLOW_PRODUCTION", () => {
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS", "true")
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("VERCEL", "")
    vi.stubEnv("VERCEL_ENV", "")
    vi.stubEnv("LOCAL_DASHBOARD_AUTH_BYPASS_ALLOW_PRODUCTION", "1")

    expect(isLocalDashboardAuthBypassEnabled()).toBe(true)
  })
})
