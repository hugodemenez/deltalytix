import 'server-only'

const TRADE_ANALYTICS_CHUNK = 1000

export type TradeDeleteTx = {
  trade: {
    findMany: (args: {
      where: { userId: { in: string[] } }
      select: { id: true }
    }) => Promise<{ id: string }[]>
    deleteMany: (args: {
      where: { userId: { in: string[] } }
    }) => Promise<unknown>
  }
  tradeAnalytics: {
    deleteMany: (args: {
      where: { tradeId: { in: string[] } }
    }) => Promise<unknown>
  }
  rithmicProtocolFill: {
    deleteMany: (args: {
      where: { userId: { in: string[] } }
    }) => Promise<unknown>
  }
}

/**
 * Order matters: TradeAnalytics has no FK to Trade, so delete analytics by
 * trade id before trades. RithmicProtocolFill has a bare userId string (no
 * User FK), so delete fills explicitly. Analytics deletes are chunked.
 */
export async function deleteUserTradeRelatedRows(
  tx: TradeDeleteTx,
  userIds: string[],
): Promise<{ tradeIds: string[] }> {
  if (userIds.length === 0) return { tradeIds: [] }

  const trades = await tx.trade.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  })
  const tradeIds = trades.map((trade) => trade.id)
  for (let i = 0; i < tradeIds.length; i += TRADE_ANALYTICS_CHUNK) {
    const chunk = tradeIds.slice(i, i + TRADE_ANALYTICS_CHUNK)
    await tx.tradeAnalytics.deleteMany({
      where: { tradeId: { in: chunk } },
    })
  }
  await tx.rithmicProtocolFill.deleteMany({
    where: { userId: { in: userIds } },
  })
  await tx.trade.deleteMany({ where: { userId: { in: userIds } } })
  return { tradeIds }
}
