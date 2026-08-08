import { beforeEach, describe, expect, it, vi } from "vitest"

const getUserId = vi.fn()
const findUnique = vi.fn()

vi.mock("@/server/auth", () => ({
  getUserId: () => getUserId(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}))

import { requireTeamAccess } from "./team-auth"

beforeEach(() => {
  getUserId.mockReset()
  findUnique.mockReset()
})

describe("requireTeamAccess", () => {
  it("allows the team owner", async () => {
    getUserId.mockResolvedValue("owner-1")
    findUnique.mockResolvedValue({ userId: "owner-1", managers: [] })

    await expect(requireTeamAccess("team-1")).resolves.toBe("owner-1")
  })

  it("allows a team manager", async () => {
    getUserId.mockResolvedValue("manager-1")
    findUnique.mockResolvedValue({
      userId: "owner-1",
      managers: [{ id: "mgr-row-1" }],
    })

    await expect(requireTeamAccess("team-1")).resolves.toBe("manager-1")
  })

  it("refuses a signed-in outsider", async () => {
    getUserId.mockResolvedValue("outsider-1")
    findUnique.mockResolvedValue({ userId: "owner-1", managers: [] })

    await expect(requireTeamAccess("team-1")).rejects.toThrow("Unauthorized")
  })

  it("refuses an unknown team", async () => {
    getUserId.mockResolvedValue("owner-1")
    findUnique.mockResolvedValue(null)

    await expect(requireTeamAccess("missing")).rejects.toThrow("Unauthorized")
  })
})
