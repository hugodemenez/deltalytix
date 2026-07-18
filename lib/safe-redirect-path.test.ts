import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "./safe-redirect-path"

describe("safeRedirectPath", () => {
  it("returns fallback for nullish values", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard")
    expect(safeRedirectPath(undefined)).toBe("/dashboard")
    expect(safeRedirectPath("")).toBe("/dashboard")
  })

  it("allows in-app relative paths", () => {
    expect(safeRedirectPath("/dashboard/settings")).toBe("/dashboard/settings")
    expect(safeRedirectPath("dashboard/settings")).toBe("/dashboard/settings")
    expect(safeRedirectPath("%2Fdashboard%2Ftrades")).toBe("/dashboard/trades")
  })

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard")
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard")
    expect(safeRedirectPath("\\\\evil.example")).toBe("/dashboard")
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard")
    expect(safeRedirectPath("http://evil.example/path")).toBe("/dashboard")
  })

  it("rejects invalid percent-encoding", () => {
    expect(safeRedirectPath("%E0%A4%A")).toBe("/dashboard")
  })

  it("supports a custom fallback", () => {
    expect(safeRedirectPath("//evil.example", "/home")).toBe("/home")
  })
})
