import { beforeEach, describe, expect, it, vi } from "vitest"

const { resolveDbUserId, prismaMock } = vi.hoisted(() => ({
  resolveDbUserId: vi.fn(),
  prismaMock: {
    oAuthApp: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    oAuthAccessToken: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}))

vi.mock("@/lib/api/db-user", () => ({ resolveDbUserId }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { GET as listApps, POST as createApp } from "./route"
import { DELETE as deleteApp, PATCH as patchApp } from "./[appId]/route"
import { POST as rotateSecret } from "./[appId]/rotate-secret/route"

const ctx = (appId: string) => ({ params: Promise.resolve({ appId }) })
const jsonRequest = (body: unknown, method = "POST") =>
  new Request("https://deltalytix.test/api/settings/oauth-apps", {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const row = {
  id: "app-1",
  name: "My trading bot",
  description: null,
  logoUrl: null,
  clientId: "dltx_app_abc",
  redirectUris: ["https://bot.example.com/callback"],
  scopes: ["trades:read"],
  createdAt: new Date("2026-10-17T10:00:00.000Z"),
  updatedAt: new Date("2026-10-17T10:00:00.000Z"),
  secretRotatedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveDbUserId.mockResolvedValue("user-a")
})

describe("/api/settings/oauth-apps", () => {
  it("401s without a session", async () => {
    resolveDbUserId.mockRejectedValue(new Error("no session"))
    const res = await listApps()
    expect(res.status).toBe(401)
  })

  it("lists apps with ISO dates and connectedUserCount", async () => {
    prismaMock.oAuthApp.findMany.mockResolvedValue([row])
    prismaMock.oAuthAccessToken.findMany.mockResolvedValue([
      { appId: "app-1", userId: "u1" },
      { appId: "app-1", userId: "u2" },
      { appId: "app-1", userId: "u3" },
    ])
    const res = await listApps()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.apps[0]).toMatchObject({
      id: "app-1",
      createdAt: "2026-10-17T10:00:00.000Z",
      secretRotatedAt: null,
      connectedUserCount: 3,
    })
  })

  it("422s with per-field details on invalid create", async () => {
    const res = await createApp(
      jsonRequest({ name: "Bot", redirectUris: ["https://ok.example.com/cb", "http://bad.example.com"], scopes: ["trades:read"] }),
    )
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.details).toEqual([
      { field: "redirectUris[1]", message: "Use https, or http only for localhost." },
    ])
    expect(prismaMock.oAuthApp.create).not.toHaveBeenCalled()
  })

  it("400s on a non-JSON body", async () => {
    const res = await createApp(jsonRequest("not json"))
    expect(res.status).toBe(400)
  })

  it("201s with the secret once on create", async () => {
    prismaMock.oAuthApp.create.mockImplementation(async ({ data }) => ({
      ...row,
      clientId: data.clientId,
      secretRotatedAt: data.secretRotatedAt,
    }))
    const res = await createApp(
      jsonRequest({ name: "Bot", redirectUris: ["https://ok.example.com/cb"], scopes: ["trades:read"] }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(typeof body.clientSecret).toBe("string")
    expect(body.app.connectedUserCount).toBe(0)
    expect(typeof body.app.secretRotatedAt).toBe("string")
  })
})

describe("/api/settings/oauth-apps/[appId]", () => {
  it("PATCH 404s for an app the user does not own", async () => {
    prismaMock.oAuthApp.updateMany.mockResolvedValue({ count: 0 })
    const res = await patchApp(jsonRequest({ name: "x" }, "PATCH"), ctx("victim"))
    expect(res.status).toBe(404)
  })

  it("PATCH returns the updated app", async () => {
    prismaMock.oAuthApp.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.oAuthApp.findFirst.mockResolvedValue({ ...row, name: "Renamed" })
    prismaMock.oAuthAccessToken.findMany.mockResolvedValue([])
    const res = await patchApp(jsonRequest({ name: "Renamed" }, "PATCH"), ctx("app-1"))
    expect(res.status).toBe(200)
    expect((await res.json()).app).toMatchObject({ name: "Renamed", connectedUserCount: 0 })
  })

  it("DELETE returns disconnectedUserCount", async () => {
    prismaMock.oAuthApp.findFirst.mockResolvedValue({ id: "app-1" })
    prismaMock.oAuthAccessToken.findMany.mockResolvedValue([{ appId: "app-1", userId: "u1" }])
    prismaMock.oAuthApp.deleteMany.mockResolvedValue({ count: 1 })
    const res = await deleteApp(new Request("https://x.test"), ctx("app-1"))
    expect(await res.json()).toEqual({ deleted: true, disconnectedUserCount: 1 })
  })

  it("rotate-secret returns secretRotatedAt", async () => {
    prismaMock.oAuthApp.findFirst.mockResolvedValue({ id: "app-1", clientId: "dltx_app_abc" })
    prismaMock.oAuthApp.updateMany.mockResolvedValue({ count: 1 })
    const res = await rotateSecret(new Request("https://x.test", { method: "POST" }), ctx("app-1"))
    const body = await res.json()
    expect(body.clientId).toBe("dltx_app_abc")
    expect(new Date(body.secretRotatedAt).toString()).not.toBe("Invalid Date")
  })
})
