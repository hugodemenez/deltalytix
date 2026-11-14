import { describe, expect, it, vi } from "vitest"

import { deleteUserTradeRelatedRows } from "./delete-account"

describe("deleteUserTradeRelatedRows", () => {
  it("deletes TradeAnalytics by trade id, then fills, then trades", async () => {
    const order: string[] = []
    const tx = {
      trade: {
        findMany: vi.fn(async () => {
          order.push("findMany")
          return [{ id: "trade-1" }, { id: "trade-2" }]
        }),
        deleteMany: vi.fn(async () => {
          order.push("trade.deleteMany")
          return { count: 2 }
        }),
      },
      tradeAnalytics: {
        deleteMany: vi.fn(async (args: { where: { tradeId: { in: string[] } } }) => {
          order.push("tradeAnalytics.deleteMany")
          expect(args.where.tradeId.in).toEqual(["trade-1", "trade-2"])
          return { count: 2 }
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

    expect(result.tradeIds).toEqual(["trade-1", "trade-2"])
    expect(order).toEqual([
      "findMany",
      "tradeAnalytics.deleteMany",
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
