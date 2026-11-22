import { describe, expect, it, vi } from "vitest"

import { deleteUserTradeRelatedRows } from "./trade-rows"

describe("deleteUserTradeRelatedRows", () => {
  it("deletes TradeAnalytics by trade id in chunks, then fills, then trades", async () => {
    const order: string[] = []
    const tradeIds = Array.from({ length: 1001 }, (_, i) => `trade-${i}`)
    const tx = {
      trade: {
        findMany: vi.fn(async () => {
          order.push("findMany")
          return tradeIds.map((id) => ({ id }))
        }),
        deleteMany: vi.fn(async () => {
          order.push("trade.deleteMany")
          return { count: tradeIds.length }
        }),
      },
      tradeAnalytics: {
        deleteMany: vi.fn(async (args: { where: { tradeId: { in: string[] } } }) => {
          order.push(`tradeAnalytics.deleteMany:${args.where.tradeId.in.length}`)
          return { count: args.where.tradeId.in.length }
        }),
      },
      rithmicProtocolFill: {
        deleteMany: vi.fn(async (args: { where: { userId: { in: string[] } } }) => {
          order.push("rithmicProtocolFill.deleteMany")
          expect(args.where.userId.in).toEqual(["user-a", "user-b"])
          return { count: 1 }
        }),
      },
    }

    const result = await deleteUserTradeRelatedRows(tx, ["user-a", "user-b"])

    expect(result.tradeIds).toHaveLength(1001)
    expect(order).toEqual([
      "findMany",
      "tradeAnalytics.deleteMany:1000",
      "tradeAnalytics.deleteMany:1",
      "rithmicProtocolFill.deleteMany",
      "trade.deleteMany",
    ])
  })

  it("skips TradeAnalytics when the user has no trades", async () => {
    const tx = {
      trade: {
        findMany: vi.fn(async () => []),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      tradeAnalytics: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      rithmicProtocolFill: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    }

    await deleteUserTradeRelatedRows(tx, ["user-a"])

    expect(tx.tradeAnalytics.deleteMany).not.toHaveBeenCalled()
    expect(tx.rithmicProtocolFill.deleteMany).toHaveBeenCalledOnce()
    expect(tx.trade.deleteMany).toHaveBeenCalledOnce()
  })

  it("no-ops when userIds is empty", async () => {
    const tx = {
      trade: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      tradeAnalytics: { deleteMany: vi.fn() },
      rithmicProtocolFill: { deleteMany: vi.fn() },
    }

    await deleteUserTradeRelatedRows(tx, [])

    expect(tx.trade.findMany).not.toHaveBeenCalled()
  })
})
