import { describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"

const ownedApps = [
  {
    id: "app_1",
    name: "My journal",
    clientId: "dltx_app_123",
  },
]

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }))
vi.mock("../settings/connections-actions", () => ({
  listOwnedOAuthAppsAction: vi.fn(async () => ownedApps),
}))
vi.mock("./developers-client", () => ({ default: function DevelopersClient() { return null } }))

import DevelopersPage from "./page"
import DevelopersClient from "./developers-client"
import nextConfig from "../../../../next.config"

describe("developers page", () => {
  it("serves the Developers page with the user's own apps instead of redirecting", async () => {
    const element = (await DevelopersPage()) as ReactElement<{ initialOwnedApps: unknown }>
    expect(element.type).toBe(DevelopersClient)
    expect(element.props.initialOwnedApps).toBe(ownedApps)
  })

  it("no longer redirects /dashboard/developers to Settings", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? []
    expect(redirects.some((r) => r.source.includes("dashboard/developers"))).toBe(false)
  })
})
