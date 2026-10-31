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
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }))
vi.mock("@/lib/posthog-server", () => ({ capturePostHogEvent: vi.fn() }))
vi.mock("@/server/connections", () => ({
  upsertAccountsForNumbers: vi.fn(async () => new Map()),
}))

import type { Trade } from "@/prisma/generated/prisma/client"
import { saveTradesCore } from "./save-trades-core"

const ACCOUNT = "LFE050-I7X0S9B3-TEST001"

/** Rows rebuilt from the trader's ATAS export (one 5-lot stored as four pieces). */
const stored = (
  [
    ["1245660", 1],
    ["1245661", 1],
    ["1245662", 1],
    ["1245663", 2],
  ] as const
).map(([entryId, quantity], i) => ({
  id: `rebuilt-${i}`,
  accountNumber: ACCOUNT,
  instrument: "MES",
  side: "Short",
  quantity,
  entryPrice: "7761",
  closePrice: "7764.75",
  entryDate: "2026-09-30T13:57:21.000+00:00",
  closeDate: "2026-09-30T13:59:40.000+00:00",
  entryId,
  closeId: "1246380",
}))

const syncTrade = {
  id: "",
  accountNumber: ACCOUNT,
  accountId: null,
  quantity: 5,
  entryId: "1245663",
  closeId: "1246380",
  instrument: "MES",
  entryPrice: "7761",
  closePrice: "7764.75",
  entryDate: "2026-09-30T13:57:21.412+00:00",
  closeDate: "2026-09-30T13:59:40.877+00:00",
  pnl: -93.75,
  timeInPosition: 139,
  userId: "",
  side: "Short",
  commission: 5,
  createdAt: new Date(),
  comment: "",
  tags: ["rithmic-protocol"],
  imageBase64: null,
  videoUrl: null,
  imageBase64Second: null,
  groupId: null,
  images: [],
} as unknown as Trade

describe("saveTradesCore Rithmic coverage guard", () => {
  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 0 })
    findFirst.mockReset().mockResolvedValue({ id: "x" })
    findMany
      .mockReset()
      .mockImplementation(async (args: { where?: { tags?: unknown } }) =>
        args?.where?.tags ? stored : [],
      )
  })

  it("a sync over the rebuilt rows inserts nothing", async () => {
    const result = await saveTradesCore([syncTrade], { userId: "u1" })
    expect(createMany).toHaveBeenCalledTimes(1)
    expect(createMany.mock.calls[0][0].data).toHaveLength(0)
    expect(result.numberOfTradesAdded).toBe(0)
  })

  it("does not rewrite a stored piece's commission when a bigger trade resolves to it", async () => {
    await saveTradesCore([syncTrade], { userId: "u1" })
    const commissionLookups = findMany.mock.calls.filter(
      ([args]) => (args as { select?: { commission?: boolean } })?.select?.commission,
    )
    expect(commissionLookups).toHaveLength(0)
  })

  it("a new trade on the same account is still inserted", async () => {
    createMany.mockResolvedValue({ count: 1 })
    const fresh = {
      ...syncTrade,
      entryId: "1300000",
      closeId: "1300001",
      entryDate: "2026-10-22T14:00:00.000+00:00",
      closeDate: "2026-10-22T14:05:00.000+00:00",
    } as Trade
    await saveTradesCore([fresh], { userId: "u1" })
    expect(createMany.mock.calls[0][0].data).toHaveLength(1)
  })
})
