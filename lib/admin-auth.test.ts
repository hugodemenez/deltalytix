import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()

vi.mock("@/server/auth", () => ({
  createClient: async () => ({
    auth: {
      getUser,
    },
  }),
}))

import { requireAdminUser } from "./admin-auth"

const ORIGINAL_ADMIN = process.env.ADMIN_USER_ID

beforeEach(() => {
  getUser.mockReset()
  process.env.ADMIN_USER_ID = "admin-user-id"
})

afterEach(() => {
  if (ORIGINAL_ADMIN === undefined) {
    delete process.env.ADMIN_USER_ID
  } else {
    process.env.ADMIN_USER_ID = ORIGINAL_ADMIN
  }
})

describe("requireAdminUser", () => {
  it("returns the admin id when the session matches", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "admin-user-id" } },
      error: null,
    })

    await expect(requireAdminUser()).resolves.toBe("admin-user-id")
  })

  it("refuses an unauthenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAdminUser()).rejects.toThrow("Unauthorized")
  })

  it("refuses a signed-in non-admin", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "someone-else" } },
      error: null,
    })

    await expect(requireAdminUser()).rejects.toThrow("Unauthorized")
  })

  it("fails closed when ADMIN_USER_ID is unset", async () => {
    delete process.env.ADMIN_USER_ID
    getUser.mockResolvedValue({
      data: { user: { id: "admin-user-id" } },
      error: null,
    })

    await expect(requireAdminUser()).rejects.toThrow("Unauthorized")
  })
})
