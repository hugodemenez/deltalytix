import { prisma } from '@/lib/prisma'
import { decryptConnectionToken } from '@/lib/connection-token-crypto'
import { serverActor } from '@/lib/api/server-actor'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { getRithmicProtocolTrades } from '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions'
import { scopeProtocolAccountIds } from './scope-accounts'

const SERVICE = 'rithmic-protocol'

export type AccountProtocolSnapshot = {
  tradeCount: number
  pnl: number
  fillCount: number
}

export type AdminAccountResyncResult = {
  dryRun: boolean
  userId: string
  accountNumber: string
  before: AccountProtocolSnapshot
  wouldDelete?: AccountProtocolSnapshot
  deleted?: { trades: number; fills: number }
  after?: AccountProtocolSnapshot & {
    savedCount: number
    tradesCount: number
  }
  error?: string
}

function parseAccountIds(tokenJson: string): string[] {
  try {
    const parsed = JSON.parse(tokenJson) as { accountIds?: unknown }
    if (!Array.isArray(parsed.accountIds)) return []
    return parsed.accountIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    )
  } catch {
    return []
  }
}

export async function summarizeAccountProtocolData(
  userId: string,
  accountNumber: string,
): Promise<AccountProtocolSnapshot> {
  const [trades, fillCount] = await Promise.all([
    prisma.trade.findMany({
      where: {
        userId,
        accountNumber,
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
      select: { pnl: true },
    }),
    prisma.rithmicProtocolFill.count({
      where: { userId, accountNumber },
    }),
  ])
  return {
    tradeCount: trades.length,
    pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
    fillCount,
  }
}

export async function deleteAccountProtocolTradesAndFills(
  userId: string,
  accountNumber: string,
): Promise<{ trades: number; fills: number }> {
  const [trades, fills] = await prisma.$transaction([
    prisma.trade.deleteMany({
      where: {
        userId,
        accountNumber,
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
    }),
    prisma.rithmicProtocolFill.deleteMany({
      where: { userId, accountNumber },
    }),
  ])
  return { trades: trades.count, fills: fills.count }
}

async function loadConnectionForAccount(params: {
  userId: string
  accountNumber: string
}): Promise<
  | { connectionId: string; storedTokenJson: string; accountIds: string[] }
  | { error: 'NO_TOKEN_RECONNECT' | 'ACCOUNT_NOT_ON_CONNECTION' }
> {
  const connections = await prisma.connection.findMany({
    where: { userId: params.userId, service: SERVICE },
    select: {
      id: true,
      token: true,
      accounts: { select: { number: true } },
    },
  })
  if (connections.length === 0) {
    return { error: 'NO_TOKEN_RECONNECT' }
  }

  for (const connection of connections) {
    if (!connection.token) continue
    let storedTokenJson: string | null
    try {
      storedTokenJson = decryptConnectionToken(connection.token)
    } catch {
      continue
    }
    if (!storedTokenJson) continue
    const fromToken = parseAccountIds(storedTokenJson)
    const fromRows = connection.accounts.map((account) => account.number)
    const available = [...new Set([...fromToken, ...fromRows])]
    const scoped = scopeProtocolAccountIds(available, [params.accountNumber])
    if ('error' in scoped) continue
    return {
      connectionId: connection.id,
      storedTokenJson,
      accountIds: scoped.accountIds,
    }
  }

  return { error: 'ACCOUNT_NOT_ON_CONNECTION' }
}

/**
 * Admin rebuild of one Protocol trading account. Does not touch Mood/journal
 * rows, other accounts, or the Connection credentials row.
 */
export async function resyncRithmicProtocolAccount(params: {
  userId: string
  accountNumber: string
  dryRun?: boolean
  actor?: string
}): Promise<AdminAccountResyncResult> {
  const userId = params.userId.trim()
  const accountNumber = params.accountNumber.trim()
  const before = await summarizeAccountProtocolData(userId, accountNumber)

  const base = {
    dryRun: params.dryRun === true,
    userId,
    accountNumber,
    before,
  }

  if (params.dryRun) {
    console.log(
      `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} dryRun=true trades=${before.tradeCount} pnl=${before.pnl} fills=${before.fillCount}`,
    )
    return { ...base, wouldDelete: before }
  }

  const connection = await loadConnectionForAccount({ userId, accountNumber })
  if ('error' in connection) {
    console.log(
      `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} error=${connection.error}`,
    )
    return { ...base, error: connection.error }
  }

  const deleted = await deleteAccountProtocolTradesAndFills(userId, accountNumber)
  const syncResult = await getRithmicProtocolTrades(connection.storedTokenJson, {
    ...serverActor(userId),
    connectionId: connection.connectionId,
    accountNumbers: [accountNumber],
    skipConnectionStamp: true,
  })

  const afterSnapshot = await summarizeAccountProtocolData(userId, accountNumber)
  const after = {
    ...afterSnapshot,
    savedCount: syncResult.savedCount ?? 0,
    tradesCount: syncResult.tradesCount ?? 0,
  }

  console.log(
    `[ADMIN-RESYNC] actor=${params.actor ?? 'unknown'} userId=${userId} account=${accountNumber} dryRun=false ` +
      `deletedTrades=${deleted.trades} deletedFills=${deleted.fills} ` +
      `beforeTrades=${before.tradeCount} beforePnl=${before.pnl} ` +
      `afterTrades=${after.tradeCount} afterPnl=${after.pnl} ` +
      `saved=${after.savedCount} syncError=${syncResult.error ?? 'none'}`,
  )

  if (syncResult.error) {
    return { ...base, deleted, after, error: syncResult.error }
  }

  return { ...base, deleted, after }
}
