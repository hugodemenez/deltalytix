import { beforeEach, describe, expect, it, vi } from "vitest"
import { sha256 } from "./tokens"

const { findUnique, update, afterMock } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  afterMock: vi.fn(),
}))

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>()
  return {
    ...actual,
    after: afterMock,
  }
})

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAccessToken: {
      findUnique,
      update,
    },
  },
}))

import { authenticateApiRequest } from "./auth"

function bearerRequest(token: string) {
  return new Request("https://example.test/api/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function tokenRecord(
  overrides: Partial<{
    id: string
    userId: string
    scopes: string[]
    revokedAt: Date | null
    expiresAt: Date | null
  }> = {},
) {
  return {
    id: "tok_1",
    userId: "user_1",
    scopes: ["profile:read"],
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    tokenHash: sha256("dltx_at_valid"),
    ...overrides,
  }
}

async function runScheduledLastUsedAt() {
  expect(afterMock).toHaveBeenCalledTimes(1)
  const callback = afterMock.mock.calls[0]?.[0] as () => Promise<unknown>
  return callback()
}

describe("authenticateApiRequest", () => {
  beforeEach(() => {
    findUnique.mockReset()
    update.mockReset().mockResolvedValue({})
    afterMock.mockReset()
  })

  it("rejects a missing bearer token without touching lastUsedAt", async () => {
    const result = await authenticateApiRequest(
      new Request("https://example.test/api/v1/me"),
    )

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected failure")
    expect(result.response.status).toBe(401)
    expect(afterMock).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("rejects an unknown or revoked token without scheduling lastUsedAt", async () => {
    findUnique.mockResolvedValueOnce(null)
    const missing = await authenticateApiRequest(bearerRequest("dltx_at_missing"))
    expect(missing.ok).toBe(false)
    expect(afterMock).not.toHaveBeenCalled()

    findUnique.mockResolvedValueOnce(tokenRecord({ revokedAt: new Date() }))
    const revoked = await authenticateApiRequest(bearerRequest("dltx_at_valid"))
    expect(revoked.ok).toBe(false)
    expect(afterMock).not.toHaveBeenCalled()
  })

  it("rejects an expired token without scheduling lastUsedAt", async () => {
    findUnique.mockResolvedValueOnce(
      tokenRecord({ expiresAt: new Date(Date.now() - 1_000) }),
    )

    const result = await authenticateApiRequest(bearerRequest("dltx_at_valid"))

    expect(result.ok).toBe(false)
    expect(afterMock).not.toHaveBeenCalled()
  })

  it("rejects insufficient scopes without scheduling lastUsedAt", async () => {
    findUnique.mockResolvedValueOnce(tokenRecord({ scopes: ["profile:read"] }))

    const result = await authenticateApiRequest(bearerRequest("dltx_at_valid"), [
      "trades:read",
    ])

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected failure")
    expect(result.response.status).toBe(403)
    expect(afterMock).not.toHaveBeenCalled()
  })

  it("schedules lastUsedAt via after() on successful auth", async () => {
    findUnique.mockResolvedValueOnce(tokenRecord())

    const result = await authenticateApiRequest(bearerRequest("dltx_at_valid"), [
      "profile:read",
    ])

    expect(result).toEqual({
      ok: true,
      auth: {
        userId: "user_1",
        scopes: ["profile:read"],
        tokenId: "tok_1",
      },
    })
    expect(update).not.toHaveBeenCalled()

    await runScheduledLastUsedAt()

    expect(update).toHaveBeenCalledWith({
      where: { id: "tok_1" },
      data: { lastUsedAt: expect.any(Date) },
    })
  })

  it("swallows lastUsedAt update failures from the after() callback", async () => {
    findUnique.mockResolvedValueOnce(tokenRecord())
    update.mockRejectedValueOnce(new Error("db down"))

    const result = await authenticateApiRequest(bearerRequest("dltx_at_valid"))

    expect(result.ok).toBe(true)
    await expect(runScheduledLastUsedAt()).resolves.toBeUndefined()
  })
})
