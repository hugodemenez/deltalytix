import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  findManyTokens,
  updateManyTokens,
  deleteManyCodes,
  findManyApps,
  findFirstApp,
  updateManyApps,
  deleteManyApps,
  transaction,
} = vi.hoisted(() => ({
  findManyTokens: vi.fn(),
  updateManyTokens: vi.fn(),
  deleteManyCodes: vi.fn(),
  findManyApps: vi.fn(),
  findFirstApp: vi.fn(),
  updateManyApps: vi.fn(),
  deleteManyApps: vi.fn(),
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
  }
})

import {
  deleteOwnedOAuthAppForUser,
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
    })
    expect(findFirstApp).toHaveBeenCalledWith({
      where: { id: "app-1", userId: "user-a" },
      select: { id: true, clientId: true },
    })
    expect(updateManyApps).toHaveBeenCalledWith({
      where: { id: "app-1", userId: "user-a" },
      data: {
        clientSecretHash: sha256("dltx_secret_rotated_test_value"),
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
    deleteManyApps.mockResolvedValue({ count: 0 })
    const result = await deleteOwnedOAuthAppForUser("attacker", "victim-app")
    expect(result).toEqual({ deleted: false })
    expect(deleteManyApps).toHaveBeenCalledWith({
      where: { id: "victim-app", userId: "attacker" },
    })
  })
})
