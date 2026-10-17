import { describe, expect, it, vi } from "vitest"
import {
  revokePriorOAuthGrantsForUserApp,
  type RevokePriorOAuthGrantsDb,
} from "./revoke-prior-oauth-grants"

function mockDb(tokenCount = 0, codeCount = 0): {
  db: RevokePriorOAuthGrantsDb
  tokenUpdate: ReturnType<typeof vi.fn>
  codeUpdate: ReturnType<typeof vi.fn>
} {
  const tokenUpdate = vi.fn().mockResolvedValue({ count: tokenCount })
  const codeUpdate = vi.fn().mockResolvedValue({ count: codeCount })
  return {
    db: {
      oAuthAccessToken: { updateMany: tokenUpdate },
      oAuthAuthorizationCode: { updateMany: codeUpdate },
    },
    tokenUpdate,
    codeUpdate,
  }
}

describe("revokePriorOAuthGrantsForUserApp", () => {
  it("revokes active tokens and consumes unused codes for the user+app pair", async () => {
    const { db, tokenUpdate, codeUpdate } = mockDb(2, 1)
    const now = new Date("2026-10-17T12:00:00.000Z")

    await expect(
      revokePriorOAuthGrantsForUserApp(db, {
        userId: "user_1",
        appId: "app_1",
        now,
      }),
    ).resolves.toEqual({ revokedTokens: 2, consumedCodes: 1 })

    expect(tokenUpdate).toHaveBeenCalledWith({
      where: { userId: "user_1", appId: "app_1", revokedAt: null },
      data: { revokedAt: now },
    })
    expect(codeUpdate).toHaveBeenCalledWith({
      where: { userId: "user_1", appId: "app_1", consumedAt: null },
      data: { consumedAt: now },
    })
  })

  it("scopes updates to the given app so other apps are untouched", async () => {
    const { db, tokenUpdate, codeUpdate } = mockDb()

    await revokePriorOAuthGrantsForUserApp(db, {
      userId: "user_1",
      appId: "app_only",
      now: new Date("2026-10-17T12:00:00.000Z"),
    })

    expect(tokenUpdate.mock.calls[0][0].where.appId).toBe("app_only")
    expect(codeUpdate.mock.calls[0][0].where.appId).toBe("app_only")
    expect(tokenUpdate.mock.calls[0][0].where.userId).toBe("user_1")
    expect(codeUpdate.mock.calls[0][0].where.userId).toBe("user_1")
  })

  it("only targets non-revoked tokens and unconsumed codes", async () => {
    const { db, tokenUpdate, codeUpdate } = mockDb()

    await revokePriorOAuthGrantsForUserApp(db, {
      userId: "user_1",
      appId: "app_1",
      now: new Date("2026-10-17T12:00:00.000Z"),
    })

    expect(tokenUpdate.mock.calls[0][0].where.revokedAt).toBeNull()
    expect(codeUpdate.mock.calls[0][0].where.consumedAt).toBeNull()
  })

  it("returns zero counts when nothing was active", async () => {
    const { db } = mockDb(0, 0)

    await expect(
      revokePriorOAuthGrantsForUserApp(db, {
        userId: "user_1",
        appId: "app_1",
        now: new Date("2026-10-17T12:00:00.000Z"),
      }),
    ).resolves.toEqual({ revokedTokens: 0, consumedCodes: 0 })
  })
})
