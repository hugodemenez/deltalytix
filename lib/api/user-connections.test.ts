import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  findManyTokens,
  updateManyTokens,
  deleteManyCodes,
  findManyApps,
  findFirstApp,
  updateManyApps,
  deleteManyApps,
  createApp,
  transaction,
} = vi.hoisted(() => ({
  findManyTokens: vi.fn(),
  updateManyTokens: vi.fn(),
  deleteManyCodes: vi.fn(),
  findManyApps: vi.fn(),
  findFirstApp: vi.fn(),
  updateManyApps: vi.fn(),
  deleteManyApps: vi.fn(),
  createApp: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAccessToken: {
      findMany: findManyTokens,
      updateMany: updateManyTokens,
    },
    oAuthAuthorizationCode: {
      deleteMany: deleteManyCodes,
    },
    oAuthApp: {
      findMany: findManyApps,
      findFirst: findFirstApp,
      updateMany: updateManyApps,
      deleteMany: deleteManyApps,
      create: createApp,
    },
    $transaction: transaction,
  },
}))

vi.mock("@/lib/api/tokens", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/tokens")>(
    "@/lib/api/tokens",
  )
  return {
    ...actual,
    generateClientSecret: () => "dltx_secret_rotated_test_value",
    generateClientId: () => "dltx_app_generated",
  }
})

import {
  activeGrantWhere,
  countConnectedUsersByApp,
  createOwnedOAuthAppForUser,
  deleteOwnedOAuthAppForUser,
  getOwnedOAuthAppForUser,
  updateOwnedOAuthAppForUser,
  listAuthorizedOAuthAppsForUser,
  listOwnedOAuthAppsForUser,
  listPersonalAccessTokensForUser,
  revokeAuthorizedOAuthAppForUser,
  revokePersonalAccessTokenForUser,
  rotateOAuthAppSecretForUser,
} from "./user-connections"
import { sha256 } from "./tokens"

describe("listAuthorizedOAuthAppsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("groups active grants by app and merges scopes / dates", async () => {
    const older = new Date("2026-01-01T00:00:00.000Z")
    const newer = new Date("2026-03-01T00:00:00.000Z")
    const used = new Date("2026-04-01T00:00:00.000Z")

    findManyTokens.mockResolvedValue([
      {
        appId: "app-1",
        scopes: ["trades:read"],
        createdAt: newer,
        lastUsedAt: used,
        app: { id: "app-1", name: "Chart Bot", logoUrl: "https://example.com/a.png" },
      },
      {
        appId: "app-1",
        scopes: ["profile:read", "trades:read"],
        createdAt: older,
        lastUsedAt: null,
        app: { id: "app-1", name: "Chart Bot", logoUrl: "https://example.com/a.png" },
      },
      {
        appId: "app-2",
        scopes: ["accounts:read"],
        createdAt: newer,
        lastUsedAt: null,
        app: { id: "app-2", name: "Risk Tool", logoUrl: null },
      },
    ])

    const rows = await listAuthorizedOAuthAppsForUser("user-a")

    expect(findManyTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-a",
          appId: { not: null },
          revokedAt: null,
        },
      }),
    )
    expect(rows).toHaveLength(2)

    const chart = rows.find((row) => row.appId === "app-1")
    expect(chart).toMatchObject({
      name: "Chart Bot",
      logoUrl: "https://example.com/a.png",
      scopes: ["profile:read", "trades:read"],
      authorizedAt: older,
      lastUsedAt: used,
      activeTokenCount: 2,
    })
  })

  it("scopes the query to the session user id (authz)", async () => {
    findManyTokens.mockResolvedValue([])
    await listAuthorizedOAuthAppsForUser("victim")
    expect(findManyTokens.mock.calls[0][0].where.userId).toBe("victim")
  })
})

describe("revokeAuthorizedOAuthAppForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transaction.mockImplementation(async (ops: unknown[]) => {
      // Prisma $transaction([a,b]) awaits each promise-like; our mocks return values.
      return Promise.all(ops as Promise<unknown>[])
    })
    updateManyTokens.mockResolvedValue({ count: 2 })
    deleteManyCodes.mockResolvedValue({ count: 1 })
  })

  it("revokes only the caller's grants for the app and clears refresh hashes", async () => {
    const result = await revokeAuthorizedOAuthAppForUser("user-a", "app-1")

    expect(result).toEqual({ revokedTokenCount: 2 })
    expect(updateManyTokens).toHaveBeenCalledWith({
      where: {
        userId: "user-a",
        appId: "app-1",
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        refreshTokenHash: null,
      },
    })
    expect(deleteManyCodes).toHaveBeenCalledWith({
      where: {
        userId: "user-a",
        appId: "app-1",
        consumedAt: null,
      },
    })
  })

  it("does not revoke when appId is empty", async () => {
    const result = await revokeAuthorizedOAuthAppForUser("user-a", "  ")
    expect(result).toEqual({ revokedTokenCount: 0 })
    expect(transaction).not.toHaveBeenCalled()
  })

  it("cannot affect another user's tokens (where always includes userId)", async () => {
    updateManyTokens.mockResolvedValue({ count: 0 })
    deleteManyCodes.mockResolvedValue({ count: 0 })

    const result = await revokeAuthorizedOAuthAppForUser("attacker", "app-owned-by-victim")
    expect(result.revokedTokenCount).toBe(0)
    expect(updateManyTokens.mock.calls[0][0].where.userId).toBe("attacker")
  })
})

describe("personal access tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists only PATs for the session user by default (active)", async () => {
    findManyTokens.mockResolvedValue([])
    await listPersonalAccessTokensForUser("user-a")
    expect(findManyTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a", appId: null, revokedAt: null },
      }),
    )
  })

  it("revokes only the owner's active PAT", async () => {
    updateManyTokens.mockResolvedValue({ count: 1 })
    const result = await revokePersonalAccessTokenForUser("user-a", "tok-1")
    expect(result).toEqual({ revoked: true })
    expect(updateManyTokens).toHaveBeenCalledWith({
      where: {
        id: "tok-1",
        userId: "user-a",
        appId: null,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        refreshTokenHash: null,
      },
    })
  })

  it("returns revoked:false when the token belongs to someone else", async () => {
    updateManyTokens.mockResolvedValue({ count: 0 })
    const result = await revokePersonalAccessTokenForUser("attacker", "victim-token")
    expect(result).toEqual({ revoked: false })
  })
})

describe("owned OAuth apps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists apps owned by the user", async () => {
    findManyApps.mockResolvedValue([])
    await listOwnedOAuthAppsForUser("user-a")
    expect(findManyApps).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-a" } }),
    )
  })

  it("rotates secret only when the user owns the app", async () => {
    findFirstApp.mockResolvedValue({ id: "app-1", clientId: "dltx_app_abc" })
    updateManyApps.mockResolvedValue({ count: 1 })

    const result = await rotateOAuthAppSecretForUser("user-a", "app-1")

    expect(result).toEqual({
      clientId: "dltx_app_abc",
      clientSecret: "dltx_secret_rotated_test_value",
      secretRotatedAt: expect.any(Date),
    })
    expect(findFirstApp).toHaveBeenCalledWith({
      where: { id: "app-1", userId: "user-a" },
      select: { id: true, clientId: true },
    })
    expect(updateManyApps).toHaveBeenCalledWith({
      where: { id: "app-1", userId: "user-a" },
      data: {
        clientSecretHash: sha256("dltx_secret_rotated_test_value"),
        secretRotatedAt: expect.any(Date),
      },
    })
  })

  it("refuses to rotate a secret the user does not own", async () => {
    findFirstApp.mockResolvedValue(null)
    const result = await rotateOAuthAppSecretForUser("attacker", "victim-app")
    expect(result).toBeNull()
    expect(updateManyApps).not.toHaveBeenCalled()
  })

  it("deletes only owned apps", async () => {
    findFirstApp.mockResolvedValue(null)
    const result = await deleteOwnedOAuthAppForUser("attacker", "victim-app")
    expect(result).toEqual({ deleted: false, disconnectedUserCount: 0 })
    expect(findFirstApp).toHaveBeenCalledWith({
      where: { id: "victim-app", userId: "attacker" },
      select: { id: true },
    })
    expect(deleteManyApps).not.toHaveBeenCalled()
  })
})

const baseApp = {
  id: "app-1",
  name: "My trading bot",
  description: null,
  logoUrl: null,
  clientId: "dltx_app_abc",
  redirectUris: ["https://bot.example.com/callback"],
  scopes: ["trades:read"],
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  secretRotatedAt: null,
}

describe("connected user counts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("counts distinct users per app among active grants, zero-filling", async () => {
    findManyTokens.mockResolvedValue([
      { appId: "app-1", userId: "u1" },
      { appId: "app-1", userId: "u2" },
      // duplicate row must not double count even if distinct is ignored
      { appId: "app-1", userId: "u2" },
      { appId: "app-2", userId: "u1" },
    ])

    const counts = await countConnectedUsersByApp(["app-1", "app-2", "app-3"])

    expect(counts.get("app-1")).toBe(2)
    expect(counts.get("app-2")).toBe(1)
    expect(counts.get("app-3")).toBe(0)
    const call = findManyTokens.mock.calls[0][0]
    expect(call.where.appId).toEqual({ in: ["app-1", "app-2", "app-3"] })
    expect(call.where.revokedAt).toBeNull()
    expect(call.distinct).toEqual(["appId", "userId"])
  })

  it("skips the query when there are no apps", async () => {
    const counts = await countConnectedUsersByApp([])
    expect(counts.size).toBe(0)
    expect(findManyTokens).not.toHaveBeenCalled()
  })

  it("treats unexpired access tokens or live refresh tokens as active", () => {
    const now = new Date("2026-10-17T12:00:00.000Z")
    expect(activeGrantWhere(now)).toEqual({
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
        {
          refreshTokenHash: { not: null },
          OR: [
            { refreshTokenExpiresAt: null },
            { refreshTokenExpiresAt: { gt: now } },
          ],
        },
      ],
    })
  })

  it("adds connectedUserCount and secretRotatedAt to owned apps", async () => {
    findManyApps.mockResolvedValue([
      baseApp,
      { ...baseApp, id: "app-2", secretRotatedAt: new Date("2026-10-10T00:00:00.000Z") },
    ])
    findManyTokens.mockResolvedValue([
      { appId: "app-1", userId: "u1" },
      { appId: "app-1", userId: "u2" },
      { appId: "app-1", userId: "u3" },
    ])

    const apps = await listOwnedOAuthAppsForUser("user-a")

    expect(apps.map((a) => [a.id, a.connectedUserCount])).toEqual([
      ["app-1", 3],
      ["app-2", 0],
    ])
    expect(apps[0].secretRotatedAt).toBeNull()
    expect(apps[1].secretRotatedAt).toEqual(new Date("2026-10-10T00:00:00.000Z"))
    expect(findManyApps.mock.calls[0][0].select.secretRotatedAt).toBe(true)
  })

  it("returns null for an app the user does not own", async () => {
    findFirstApp.mockResolvedValue(null)
    expect(await getOwnedOAuthAppForUser("attacker", "victim-app")).toBeNull()
    expect(findFirstApp.mock.calls[0][0].where).toEqual({
      id: "victim-app",
      userId: "attacker",
    })
  })
})

describe("createOwnedOAuthAppForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores only the secret hash and stamps secretRotatedAt", async () => {
    createApp.mockImplementation(async ({ data }) => ({
      ...baseApp,
      name: data.name,
      clientId: data.clientId,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      secretRotatedAt: data.secretRotatedAt,
    }))

    const result = await createOwnedOAuthAppForUser("user-a", {
      name: "  My trading bot ",
      redirectUris: ["https://bot.example.com/callback", " ", "https://bot.example.com/callback"],
      scopes: ["trades:read", "profile:read"],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.clientSecret).toBe("dltx_secret_rotated_test_value")
    expect(result.data.app.connectedUserCount).toBe(0)
    const data = createApp.mock.calls[0][0].data
    expect(data).toMatchObject({
      userId: "user-a",
      name: "My trading bot",
      description: null,
      clientId: "dltx_app_generated",
      clientSecretHash: sha256("dltx_secret_rotated_test_value"),
      redirectUris: ["https://bot.example.com/callback"],
      scopes: ["trades:read", "profile:read"],
    })
    expect(data.secretRotatedAt).toBeInstanceOf(Date)
    expect(JSON.stringify(data)).not.toContain('"dltx_secret_rotated_test_value"')
  })

  it("returns field errors and writes nothing on invalid input", async () => {
    const result = await createOwnedOAuthAppForUser("user-a", {
      name: "",
      redirectUris: ["http://bot.example.com/cb"],
      scopes: [],
    })
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      errors: [
        { field: "name", message: "Name is required." },
        { field: "redirectUris", index: 0, message: "Use https, or http only for localhost." },
        { field: "scopes", message: "Choose at least one permission." },
      ],
    })
    expect(createApp).not.toHaveBeenCalled()
  })
})

describe("updateOwnedOAuthAppForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates only the provided fields, scoped to the owner, and never touches grants", async () => {
    updateManyApps.mockResolvedValue({ count: 1 })
    findFirstApp.mockResolvedValue({ ...baseApp, scopes: ["trades:read", "trades:write"] })
    findManyTokens.mockResolvedValue([{ appId: "app-1", userId: "u1" }])

    const result = await updateOwnedOAuthAppForUser("user-a", "app-1", {
      scopes: ["trades:read", "trades:write"],
      description: "  ",
    })

    expect(updateManyApps).toHaveBeenCalledWith({
      where: { id: "app-1", userId: "user-a" },
      data: { description: null, scopes: ["trades:read", "trades:write"] },
    })
    expect(updateManyTokens).not.toHaveBeenCalled()
    expect(deleteManyCodes).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.app.connectedUserCount).toBe(1)
  })

  it("returns not_found when the app belongs to someone else", async () => {
    updateManyApps.mockResolvedValue({ count: 0 })
    const result = await updateOwnedOAuthAppForUser("attacker", "victim-app", {
      name: "Pwned",
    })
    expect(result).toEqual({ ok: false, reason: "not_found" })
    expect(updateManyApps).toHaveBeenCalledWith({
      where: { id: "victim-app", userId: "attacker" },
      data: { name: "Pwned" },
    })
  })

  it("rejects removing the last redirect URI without writing", async () => {
    const result = await updateOwnedOAuthAppForUser("user-a", "app-1", {
      redirectUris: [""],
    })
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      errors: [{ field: "redirectUris", message: "At least one redirect URI is required." }],
    })
    expect(updateManyApps).not.toHaveBeenCalled()
  })
})

describe("deleteOwnedOAuthAppForUser connected count", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reports how many users were disconnected", async () => {
    findFirstApp.mockResolvedValue({ id: "app-1" })
    findManyTokens.mockResolvedValue([
      { appId: "app-1", userId: "u1" },
      { appId: "app-1", userId: "u2" },
    ])
    deleteManyApps.mockResolvedValue({ count: 1 })

    const result = await deleteOwnedOAuthAppForUser("user-a", "app-1")

    expect(result).toEqual({ deleted: true, disconnectedUserCount: 2 })
    expect(deleteManyApps).toHaveBeenCalledWith({
      where: { id: "app-1", userId: "user-a" },
    })
  })
})
