import { beforeEach, describe, expect, it, vi } from "vitest"

const createMany = vi.fn()
const findFirst = vi.fn()
const findMany = vi.fn()
const updateTag = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trade: {
      createMany: (...args: unknown[]) => createMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}))
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  updateTag: (...args: unknown[]) => updateTag(...args),
}))
vi.mock("@/lib/posthog-server", () => ({ capturePostHogEvent: vi.fn() }))
vi.mock("@/server/connections", () => ({
  upsertAccountsForNumbers: vi.fn(async () => new Map()),
}))

import type { Trade } from "@/prisma/generated/prisma/client"
import { TRADE_CREATE_MANY_CHUNK_SIZE } from "./create-many-trades"
import { saveTradesCore } from "./save-trades-core"

function trade(index: number): Trade {
  return {
    id: "",
    accountNumber: "ACC1",
    accountId: null,
    quantity: 1,
    entryId: `e${index}`,
    closeId: `c${index}`,
    instrument: "NQ",
    entryPrice: "100",
    closePrice: "101",
    entryDate: new Date(Date.UTC(2025, 0, 6, 9, index % 60, index % 60)).toISOString(),
    closeDate: new Date(Date.UTC(2025, 0, 6, 10, index % 60, index % 60)).toISOString(),
    pnl: 20,
    timeInPosition: 60,
    userId: "",
    side: "long",
    commission: 0,
    createdAt: new Date(),
    comment: null,
    tags: [],
    imageBase64: null,
    videoUrl: null,
    imageBase64Second: null,
    groupId: "",
    images: [],
  } as Trade
}

describe("saveTradesCore chunk commits", () => {
  beforeEach(() => {
    createMany.mockReset()
    findFirst.mockReset().mockResolvedValue(null)
    findMany.mockReset().mockResolvedValue([])
    updateTag.mockReset()
  })

  it("uses one createMany and no interactive transaction at the chunk size", async () => {
    createMany.mockResolvedValue({ count: 2 })
    const result = await saveTradesCore([trade(0), trade(1)], { userId: "u1" })

    expect(result.error).toBe(false)
    expect(result.numberOfTradesAdded).toBe(2)
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany.mock.calls[0][0].data).toHaveLength(2)
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true)
  })

  it("uses one createMany at exactly the chunk size", async () => {
    createMany.mockResolvedValue({ count: TRADE_CREATE_MANY_CHUNK_SIZE })
    const result = await saveTradesCore(
      Array.from({ length: TRADE_CREATE_MANY_CHUNK_SIZE }, (_, index) => trade(index)),
      { userId: "u1" },
    )

    expect(result.error).toBe(false)
    expect(result.numberOfTradesAdded).toBe(TRADE_CREATE_MANY_CHUNK_SIZE)
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany.mock.calls[0][0].data).toHaveLength(TRADE_CREATE_MANY_CHUNK_SIZE)
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true)
    expect(updateTag).toHaveBeenCalledWith("trades-u1")
  })

  it("commits more than one chunk and reports the summed count", async () => {
    const count = TRADE_CREATE_MANY_CHUNK_SIZE + 1
    createMany.mockImplementation(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }))

    const result = await saveTradesCore(
      Array.from({ length: count }, (_, index) => trade(index)),
      { userId: "u1" },
    )

    expect(result.error).toBe(false)
    expect(result.numberOfTradesAdded).toBe(count)
    expect(createMany).toHaveBeenCalledTimes(2)
    expect(createMany.mock.calls[0][0].data).toHaveLength(TRADE_CREATE_MANY_CHUNK_SIZE)
    expect(createMany.mock.calls[1][0].data).toHaveLength(1)
    expect(updateTag).toHaveBeenCalledWith("trades-u1")
    expect(updateTag).toHaveBeenCalledWith("user-data-u1")
  })

  it("keeps the first chunk when the second chunk fails", async () => {
    const count = TRADE_CREATE_MANY_CHUNK_SIZE + 1
    createMany
      .mockResolvedValueOnce({ count: TRADE_CREATE_MANY_CHUNK_SIZE })
      .mockRejectedValueOnce(new Error("disk full"))

    const result = await saveTradesCore(
      Array.from({ length: count }, (_, index) => trade(index)),
      { userId: "u1" },
    )

    expect(result.error).toBe("DATABASE_ERROR")
    expect(result.numberOfTradesAdded).toBe(TRADE_CREATE_MANY_CHUNK_SIZE)
    expect(result.details).toBe("disk full")
    expect(createMany).toHaveBeenCalledTimes(2)
    expect(createMany.mock.calls[0][0].data).toHaveLength(TRADE_CREATE_MANY_CHUNK_SIZE)
    expect(createMany.mock.calls[1][0].data).toHaveLength(1)
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true)
    expect(createMany.mock.calls[1][0].skipDuplicates).toBe(true)
    expect(updateTag).toHaveBeenCalledWith("trades-u1")
    expect(updateTag).toHaveBeenCalledWith("user-data-u1")
  })
})
