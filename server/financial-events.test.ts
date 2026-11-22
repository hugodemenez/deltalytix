import { beforeEach, describe, expect, it, vi } from "vitest"

const findMany = vi.fn()
const getUserIdMock = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialEvent: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}))

vi.mock("@/server/auth", () => ({
  getUserId: () => getUserIdMock(),
}))

import { FinancialEventWindowTooWideError } from "@/lib/financial-events/date-window"
import { getFinancialEventsInWindow } from "./financial-events"

describe("getFinancialEventsInWindow", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([{ id: "event-1" }])
    getUserIdMock.mockReset().mockResolvedValue("user-1")
  })

  it("requires an authenticated user before reading", async () => {
    getUserIdMock.mockRejectedValue(new Error("User not authenticated"))
    await expect(
      getFinancialEventsInWindow(
        "en",
        "2026-03-01T00:00:00.000Z",
        "2026-03-31T23:59:59.999Z",
      ),
    ).rejects.toThrow("User not authenticated")
    expect(findMany).not.toHaveBeenCalled()
  })

  it("rejects a 1900-2200 window without querying", async () => {
    await expect(
      getFinancialEventsInWindow(
        "en",
        "1900-01-01T00:00:00.000Z",
        "2200-01-01T00:00:00.000Z",
      ),
    ).rejects.toBeInstanceOf(FinancialEventWindowTooWideError)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("returns events for a calendar-sized window", async () => {
    const events = await getFinancialEventsInWindow(
      "en",
      "2026-03-01T05:00:00.000Z",
      "2026-04-01T03:59:59.999Z",
    )
    expect(getUserIdMock).toHaveBeenCalledOnce()
    expect(findMany).toHaveBeenCalledWith({
      where: {
        lang: "en",
        date: {
          gte: new Date("2026-03-01T05:00:00.000Z"),
          lte: new Date("2026-04-01T03:59:59.999Z"),
        },
      },
      orderBy: { date: "asc" },
    })
    expect(events).toEqual([{ id: "event-1" }])
  })

  it("returns an empty list for a blank locale or an invalid window", async () => {
    await expect(getFinancialEventsInWindow("", "2026-03-01T00:00:00.000Z", "2026-03-02T00:00:00.000Z")).resolves.toEqual([])
    await expect(getFinancialEventsInWindow("en", "nope", "2026-03-02T00:00:00.000Z")).resolves.toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })
})
