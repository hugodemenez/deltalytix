import { beforeEach, describe, expect, it, vi } from "vitest"

const createMany = vi.fn()
const findFirst = vi.fn()
const findMany = vi.fn()
const updateMany = vi.fn()
const fillFindMany = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trade: {
      createMany: (...args: unknown[]) => createMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
    rithmicProtocolFill: {
      findMany: (...args: unknown[]) => fillFindMany(...args),
    },
  },
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }))
vi.mock("@/lib/posthog-server", () => ({ capturePostHogEvent: vi.fn() }))
vi.mock("@/server/connections", () => ({
  upsertAccountsForNumbers: vi.fn(async () => new Map()),
}))

import type { Trade } from "@/prisma/generated/prisma/client"
import { prepareRithmicProtocolFills } from "@/lib/rithmic-protocol/fill-ledger"
import { buildTradesFromRithmicFills } from "@/lib/rithmic-protocol/fills-to-trades"
import { deleteUnannotatedPhantomProtocolTrades } from "@/lib/rithmic-protocol/fill-ledger-store"
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
    updateMany.mockReset().mockResolvedValue({ count: 0 })
    fillFindMany.mockReset().mockResolvedValue([])
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

  it("a plant fill that supersedes an annotated manual trade reuses that row id", async () => {
    const annotated = {
      id: "stored-manual-trade",
      accountNumber: ACCOUNT,
      instrument: "MES",
      side: "Long",
      quantity: 1,
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:00.000+00:00",
      closeDate: "2026-09-25T15:08:00.000+00:00",
      entryId: "manual-gap",
      closeId: "1002",
      comment: "kept note",
    }
    findMany.mockImplementation(async () => [annotated])
    createMany.mockResolvedValue({ count: 0 })
    const plant = {
      ...syncTrade,
      quantity: 1,
      entryId: "88421",
      closeId: "1002",
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:04.000+00:00",
      closeDate: "2026-09-25T15:08:00.000+00:00",
      pnl: 5,
      side: "Long",
      timeInPosition: 56,
      commission: 0,
    } as Trade
    const result = await saveTradesCore([plant], { userId: "u1" })
    const inserted = createMany.mock.calls[0][0].data as Array<{
      id: string
      comment?: string | null
    }>
    expect(inserted).toHaveLength(1)
    expect(inserted[0]?.id).toBe("stored-manual-trade")
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true)
    expect(inserted[0]?.comment).not.toBe("kept note")
    expect(updateMany).not.toHaveBeenCalled()
    expect(result.numberOfTradesAdded).toBe(0)
  })

  it("keeps a distinct plant trade when the manual trade is still in the batch", async () => {
    const storedManual = {
      id: "stored-manual-trade",
      accountNumber: ACCOUNT,
      instrument: "MES",
      side: "Long",
      quantity: 2,
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:45.000+00:00",
      closeDate: "2026-09-25T15:09:00.000+00:00",
      entryId: "manual-gap",
      closeId: "1002",
    }
    findMany.mockImplementation(async (args: { where?: { tags?: unknown } }) =>
      args?.where?.tags ? [storedManual] : [],
    )
    fillFindMany.mockResolvedValue([
      { fillId: "manual-gap", confirmedDistinctFillId: "88421" },
    ])
    createMany.mockResolvedValue({ count: 2 })
    const plant = {
      ...syncTrade,
      quantity: 2,
      entryId: "88421",
      closeId: "1002",
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:00.000+00:00",
      closeDate: "2026-09-25T15:09:00.000+00:00",
      side: "Long",
      pnl: 10,
      commission: 0,
    } as Trade
    const manual = {
      ...plant,
      entryId: "manual-gap",
      entryDate: "2026-09-25T15:07:45.000+00:00",
    } as Trade
    const result = await saveTradesCore([plant, manual], { userId: "u1" })
    const inserted = createMany.mock.calls[0][0].data as Array<{
      id: string
      entryId: string
    }>
    expect(inserted).toHaveLength(2)
    const ids = inserted.map((row) => row.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids).toContain("stored-manual-trade")
    const byEntry = new Map(inserted.map((row) => [row.entryId, row.id]))
    expect(byEntry.get("manual-gap")).toBe("stored-manual-trade")
    expect(byEntry.get("88421")).not.toBe("stored-manual-trade")
    expect(result.numberOfTradesAdded).toBe(2)
  })

  it("does not store a confirm-distinct plant fill on the manual trade, and reap removes that row", async () => {
    const storedManual = {
      id: "stored-manual-trade",
      accountNumber: ACCOUNT,
      instrument: "MES",
      side: "Long",
      quantity: 2,
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:45.000+00:00",
      closeDate: "2026-09-25T15:09:00.000+00:00",
      entryId: "manual-gap",
      closeId: "1002",
      comment: null,
      tags: ["rithmic-protocol"],
    }
    findMany.mockImplementation(async (args: { where?: { tags?: unknown } }) =>
      args?.where?.tags ? [storedManual] : [],
    )
    fillFindMany.mockResolvedValue([
      { fillId: "manual-gap", confirmedDistinctFillId: "88421" },
    ])
    createMany.mockResolvedValue({ count: 1 })
    const plant = {
      ...syncTrade,
      quantity: 2,
      entryId: "88421",
      closeId: "1002",
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:00.000+00:00",
      closeDate: "2026-09-25T15:09:00.000+00:00",
      side: "Long",
      pnl: 10,
      commission: 0,
    } as Trade
    await saveTradesCore([plant], { userId: "u1" })
    const inserted = createMany.mock.calls[0][0].data as Array<{ id: string }>
    expect(inserted).toHaveLength(1)
    expect(inserted[0]?.id).not.toBe("stored-manual-trade")

    const tradeDeleteMany = vi.fn(async () => ({ count: 1 }))
    const reaped = await deleteUnannotatedPhantomProtocolTrades({
      userId: "u1",
      accountNumbers: [ACCOUNT],
      derivedTrades: [plant],
      ledgerFillIds: new Set(["manual-gap", "1002", "88421"]),
      distinctPlantIdByManualFillId: new Map([["manual-gap", "88421"]]),
      db: {
        trade: {
          findMany: async () => [storedManual],
          deleteMany: tradeDeleteMany,
        },
      } as never,
    })
    expect(reaped).toEqual({ removed: 1, retiredManualTradesKept: 0 })
    expect(tradeDeleteMany).toHaveBeenCalledTimes(1)
  })

  it("reuses the stored id when a plant fill replaces only one manual leg", async () => {
    const storedBoth = {
      id: "stored-both-manual",
      accountNumber: ACCOUNT,
      instrument: "MES",
      side: "Long",
      quantity: 1,
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:00.000+00:00",
      closeDate: "2026-09-25T15:08:00.000+00:00",
      entryId: "manual-a",
      closeId: "manual-b",
    }
    findMany.mockImplementation(async (args: { where?: { tags?: unknown } }) =>
      args?.where?.tags ? [storedBoth] : [],
    )
    createMany.mockResolvedValue({ count: 0 })
    const replaced = {
      ...syncTrade,
      quantity: 1,
      entryId: "88421",
      closeId: "manual-b",
      entryPrice: "7800",
      closePrice: "7801",
      entryDate: "2026-09-25T15:07:04.000+00:00",
      closeDate: "2026-09-25T15:08:00.000+00:00",
      side: "Long",
      pnl: 5,
      commission: 0,
    } as Trade
    await saveTradesCore([replaced], { userId: "u1" })
    const inserted = createMany.mock.calls[0][0].data as Array<{ id: string }>
    expect(inserted[0]?.id).toBe("stored-both-manual")
  })

  it("derives only the plant trade from a marked fill and does not reuse the manual row", async () => {
    const ssboe = Date.parse("2026-09-25T15:07:45Z") / 1000
    const manual = {
      accountId: ACCOUNT,
      symbol: "MESZ6",
      transactionType: "BUY",
      fillPrice: 7800,
      fillSize: 2,
      fillId: "manual-gap",
      fillDate: "20260925",
      ssboe,
      source: "manual" as const,
      confirmedDistinctFillId: "88421",
    }
    const plantFill = {
      ...manual,
      fillId: "88421",
      ssboe: ssboe - 45,
      source: "history" as const,
      confirmedDistinctFillId: undefined,
    }
    const close = {
      ...plantFill,
      fillId: "1002",
      transactionType: "SELL",
      fillPrice: 7801,
      ssboe: ssboe + 75,
    }
    const prepared = prepareRithmicProtocolFills([manual, plantFill, close])
    expect(prepared.nearMisses).toEqual([])
    const { trades, openSkipped } = buildTradesFromRithmicFills(
      prepared.fills,
      "u1",
      new Map([["MES", { tickSize: 0.25, tickValue: 1.25 }]]),
    )
    expect(openSkipped).toBe(2)
    expect(trades).toHaveLength(1)
    expect(trades[0]?.entryId).toBe("88421")
    expect(trades[0]?.closeId).toBe("1002")

    findMany.mockImplementation(async (args: { where?: { tags?: unknown } }) =>
      args?.where?.tags
        ? [
            {
              id: "stored-manual-trade",
              accountNumber: ACCOUNT,
              instrument: "MES",
              side: "Long",
              quantity: 2,
              entryPrice: "7800",
              closePrice: "7801",
              entryDate: "2026-09-25T15:07:45.000+00:00",
              closeDate: "2026-09-25T15:09:00.000+00:00",
              entryId: "manual-gap",
              closeId: "1002",
            },
          ]
        : [],
    )
    fillFindMany.mockResolvedValue([
      { fillId: "manual-gap", confirmedDistinctFillId: "88421" },
    ])
    createMany.mockResolvedValue({ count: 1 })
    await saveTradesCore(trades, { userId: "u1" })
    const inserted = createMany.mock.calls.at(-1)?.[0].data as Array<{ id: string }>
    expect(inserted).toHaveLength(1)
    expect(inserted[0]?.id).not.toBe("stored-manual-trade")
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
