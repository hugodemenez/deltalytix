import { beforeEach, describe, expect, it, vi } from "vitest"

const findMany = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEvent: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}))

import { FinancialEventWindowTooWideError } from "./date-window"
import { loadFinancialEvents } from "./load"

describe("loadFinancialEvents", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([])
  })

  it("queries inside the cap", async () => {
    const start = new Date("2026-03-01T00:00:00.000Z")
    const end = new Date("2026-03-31T23:59:59.999Z")
    await loadFinancialEvents("en", { start, end }, "desc")
    expect(findMany).toHaveBeenCalledWith({
      where: { lang: "en", date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    })
  })

  it("does not query a window that would reread the partition", async () => {
    await expect(
      loadFinancialEvents("en", {
        start: new Date("1900-01-01T00:00:00.000Z"),
        end: new Date("2200-01-01T00:00:00.000Z"),
      }, "desc"),
    ).rejects.toBeInstanceOf(FinancialEventWindowTooWideError)
    expect(findMany).not.toHaveBeenCalled()
  })
})
