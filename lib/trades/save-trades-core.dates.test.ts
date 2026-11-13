import { beforeEach, describe, expect, it, vi } from "vitest"

const createMany = vi.fn()
const findFirst = vi.fn()
const findMany = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trade: {
      createMany: (...args: unknown[]) => createMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }))
vi.mock("@/lib/posthog-server", () => ({ capturePostHogEvent: vi.fn() }))
vi.mock("@/server/connections", () => ({
  upsertAccountsForNumbers: vi.fn(async () => new Map()),
}))

import type { Trade } from "@/prisma/generated/prisma/client"
import { generatePersistedTradeUUID } from "@/lib/trade-id-utils"
import { saveTradesCore } from "./save-trades-core"

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: "",
    accountNumber: "ACC1",
    accountId: null,
    quantity: 1,
    entryId: "e1",
    closeId: "c1",
    instrument: "NQ",
    entryPrice: "100",
    closePrice: "101",
    entryDate: "2025-01-06T09:27:44.000Z",
    closeDate: "2025-01-06T09:30:00.000Z",
    pnl: 20,
    timeInPosition: 136,
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
    ...overrides,
  } as Trade
}

describe("saveTradesCore date normalization", () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 })
    findFirst.mockReset().mockResolvedValue({ id: "x" })
    findMany.mockReset().mockResolvedValue([])
  })

  it("stores canonical dates but keeps the id hashed from the importer's strings", async () => {
    const input = trade({
      entryDate: "2025-01-06T09:27:44.000Z",
      closeDate: "2025-01-06 09:30:00",
    })
    const result = await saveTradesCore([input], { userId: "u1" })

    expect(result.error).toBe(false)
    const saved = createMany.mock.calls[0][0].data[0] as Trade
    expect(saved.entryDate).toBe("2025-01-06T09:27:44.000+00:00")
    expect(saved.closeDate).toBe("2025-01-06T09:30:00.000+00:00")
    // Same id as before this change, so re-importing an old file still dedupes.
    expect(saved.id).toBe(generatePersistedTradeUUID({ ...input, userId: "u1" }))
  })

  it("rejects the batch without writing when a date is ambiguous", async () => {
    const result = await saveTradesCore(
      [trade({}), trade({ entryId: "e2", entryDate: "02/18/2025 11:01:49" })],
      { userId: "u1" },
    )

    expect(result.error).toBe("INVALID_DATA")
    expect(result.numberOfTradesAdded).toBe(0)
    expect(createMany).not.toHaveBeenCalled()
    expect(result.details).toMatchObject({
      invalidDates: [{ index: 1, field: "entryDate", value: "02/18/2025 11:01:49" }],
    })
  })
})
