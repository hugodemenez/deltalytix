import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import type { RithmicProtocolFill } from './types'
import { canonicalRithmicFillId, fillIdentityKey } from './dedupe-fills'
import {
  type AnnotatedProtocolTrade,
  partitionIncomingFills,
  phantomProtocolTradeIds,
} from './fill-ledger'

const UPSERT_CHUNK = 100

type FillRow = {
  accountNumber: string
  accountId: string | null
  identityKey: string
  fillId: string
  rawFillId: string | null
  symbol: string
  exchange: string | null
  transactionType: string
  fillPrice: number
  fillSize: number
  fillDate: string | null
  fillTime: string | null
  basketId: string | null
  sequenceNumber: string | null
  ssboe: number | null
  usecs: number | null
  source: string
}

function sourceOf(
  value: string | null | undefined,
): NonNullable<RithmicProtocolFill['source']> {
  return value === 'replay' ? 'replay' : 'history'
}

export function rowToFill(row: FillRow): RithmicProtocolFill {
  return {
    accountId: row.accountNumber,
    symbol: row.symbol,
    exchange: row.exchange ?? undefined,
    transactionType: row.transactionType,
    fillPrice: row.fillPrice,
    fillSize: row.fillSize,
    fillId: row.fillId || undefined,
    fillDate: row.fillDate ?? undefined,
    fillTime: row.fillTime ?? undefined,
    basketId: row.basketId ?? undefined,
    sequenceNumber: row.sequenceNumber ?? undefined,
    ssboe: row.ssboe ?? undefined,
    usecs: row.usecs ?? undefined,
    source: sourceOf(row.source),
  }
}

function fillToRow(
  fill: RithmicProtocolFill,
  params: {
    userId: string
    accountIdByNumber: Map<string, string>
    connectionId?: string | null
  },
): FillRow & {
  id: string
  userId: string
  connectionId: string | null
  createdAt: Date
  updatedAt: Date
} {
  const canonicalId = canonicalRithmicFillId(fill.fillId) ?? ''
  const rawFillId =
    fill.fillId && canonicalId && fill.fillId !== canonicalId ? fill.fillId : null
  const now = new Date()
  return {
    id: randomUUID(),
    userId: params.userId,
    accountNumber: fill.accountId,
    accountId: params.accountIdByNumber.get(fill.accountId) ?? null,
    identityKey: fillIdentityKey(fill),
    fillId: canonicalId,
    rawFillId,
    symbol: fill.symbol,
    exchange: fill.exchange ?? null,
    transactionType: fill.transactionType,
    fillPrice: fill.fillPrice,
    fillSize: fill.fillSize,
    fillDate: fill.fillDate ?? null,
    fillTime: fill.fillTime ?? null,
    basketId: fill.basketId ?? null,
    sequenceNumber: fill.sequenceNumber ?? null,
    ssboe: typeof fill.ssboe === 'number' ? fill.ssboe : null,
    usecs: typeof fill.usecs === 'number' ? fill.usecs : null,
    source: sourceOf(fill.source),
    connectionId: params.connectionId ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

type ProtocolStore = {
  rithmicProtocolFill: {
    findMany: typeof prisma.rithmicProtocolFill.findMany
    createMany: typeof prisma.rithmicProtocolFill.createMany
    updateMany: typeof prisma.rithmicProtocolFill.updateMany
  }
  trade: {
    findMany: typeof prisma.trade.findMany
    deleteMany: typeof prisma.trade.deleteMany
  }
}

export async function loadRithmicProtocolFills(params: {
  userId: string
  accountNumbers: string[]
  db?: ProtocolStore
}): Promise<RithmicProtocolFill[]> {
  if (params.accountNumbers.length === 0) return []
  const db = params.db ?? prisma
  const rows = await db.rithmicProtocolFill.findMany({
    where: {
      userId: params.userId,
      accountNumber: { in: params.accountNumbers },
    },
  })
  return rows.map(rowToFill)
}

export async function upsertRithmicProtocolFills(params: {
  userId: string
  fills: RithmicProtocolFill[]
  stored: RithmicProtocolFill[]
  accountIdByNumber: Map<string, string>
  connectionId?: string | null
  db?: ProtocolStore
}): Promise<{ inserted: number; updated: number; skipped: number }> {
  const { inserts, updates, skipped } = partitionIncomingFills(
    params.fills,
    params.stored,
  )
  const db = params.db ?? prisma
  const toRow = (fill: RithmicProtocolFill) =>
    fillToRow(fill, {
      userId: params.userId,
      accountIdByNumber: params.accountIdByNumber,
      connectionId: params.connectionId,
    })

  for (let offset = 0; offset < inserts.length; offset += UPSERT_CHUNK) {
    const chunk = inserts.slice(offset, offset + UPSERT_CHUNK).map(toRow)
    await db.rithmicProtocolFill.createMany({
      data: chunk,
      skipDuplicates: true,
    })
  }

  for (let offset = 0; offset < updates.length; offset += UPSERT_CHUNK) {
    const chunk = updates.slice(offset, offset + UPSERT_CHUNK)
    for (const fill of chunk) {
      const row = toRow(fill)
      await db.rithmicProtocolFill.updateMany({
        where: {
          userId: params.userId,
          identityKey: row.identityKey,
        },
        data: {
          fillId: row.fillId,
          rawFillId: row.rawFillId,
          symbol: row.symbol,
          exchange: row.exchange,
          transactionType: row.transactionType,
          fillPrice: row.fillPrice,
          fillSize: row.fillSize,
          fillDate: row.fillDate,
          fillTime: row.fillTime,
          basketId: row.basketId,
          sequenceNumber: row.sequenceNumber,
          ssboe: row.ssboe,
          usecs: row.usecs,
          source: row.source,
          accountId: row.accountId,
          connectionId: row.connectionId,
          updatedAt: row.updatedAt,
        },
      })
    }
  }

  return { inserted: inserts.length, updated: updates.length, skipped }
}

export async function deleteUnannotatedPhantomProtocolTrades(params: {
  userId: string
  accountNumbers: string[]
  derivedTrades: Array<{
    id: string
    accountNumber?: string | null
    instrument?: string | null
    entryDate?: string | null
    closeDate?: string | null
    entryId?: string | null
    closeId?: string | null
  }>
  ledgerFillIds: Set<string>
  db?: ProtocolStore
}): Promise<number> {
  if (params.accountNumbers.length === 0) return 0
  const db = params.db ?? prisma
  const existing = (await db.trade.findMany({
    where: {
      userId: params.userId,
      accountNumber: { in: params.accountNumbers },
      tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
    },
    select: {
      id: true,
      accountNumber: true,
      instrument: true,
      entryDate: true,
      closeDate: true,
      entryId: true,
      closeId: true,
      comment: true,
      tags: true,
      imageBase64: true,
      imageBase64Second: true,
      videoUrl: true,
      images: true,
      groupId: true,
    },
  })) as AnnotatedProtocolTrade[]

  const ids = phantomProtocolTradeIds({
    existing,
    derived: params.derivedTrades,
    ledgerFillIds: params.ledgerFillIds,
  })
  if (ids.length === 0) return 0

  const result = await db.trade.deleteMany({
      where: {
        userId: params.userId,
        id: { in: ids },
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
    })
  return result.count
}
