import { createHash } from 'node:crypto'
import { parseArgs } from 'node:util'
import type { Prisma } from '@/prisma/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { canonicalRithmicFillId, fillIdentityKey } from './dedupe-fills'
import {
  hasTradeJournalAnnotations,
  distinctMarkerConflict,
  listConfirmedDistinctFillIds,
  manualFillBookRelation,
  planManualFillSyncEffects,
  prepareRithmicProtocolFills,
  type ManualFillBookRelation,
} from './fill-ledger'
import { buildTradesFromRithmicFills, fillSide, normalizeInstrument } from './fills-to-trades'
import {
  loadRithmicProtocolFills,
  rowToFill,
  upsertRithmicProtocolFills,
} from './fill-ledger-store'
import type { RithmicProtocolFill } from './types'

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

const SYMBOL = /^[A-Za-z0-9._-]{1,32}$/

export const MANUAL_FILL_ID_PREFIX = 'manual-'

export type ManualFillFieldError = { field: string; message: string }

export type ValidatedManualFill = {
  userId: string
  accountNumber: string
  symbol: string
  exchange: string
  side: 'B' | 'S'
  qty: number
  price: number
  timestamp: string
  timestampMs: number
  note: string
  dryRun: boolean
  acknowledgeWarnings: boolean
}

export type ManualFillInsertResult =
  | {
      ok: true
      dryRun: boolean
      idempotent: boolean
      fillId: string
      identityKey: string
      note: string
      fill: RithmicProtocolFill
      warnings: string[]
    }
  | {
      ok: false
      status: 'validation' | 'account_not_found' | 'conflict' | 'acknowledgement_required'
      errors: ManualFillFieldError[]
      warnings?: string[]
    }

type ManualFillDeps = {
  findAccount: (
    userId: string,
    accountNumber: string,
  ) => Promise<{ id: string } | null>
  loadFills: typeof loadRithmicProtocolFills
  upsertFills: typeof upsertRithmicProtocolFills
}

function readObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  return input as Record<string, unknown>
}

function readTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function calendarDateIsReal(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

function parseTimestamp(value: string): number | null {
  if (!ISO_TIMESTAMP.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const hour = Number(value.slice(11, 13))
  const minute = Number(value.slice(14, 16))
  const second = Number(value.slice(17, 19))
  if (
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    !calendarDateIsReal(year, month, day)
  ) {
    return null
  }
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return null
  const earliest = Date.UTC(2000, 0, 1)
  const latest = Date.now() + 24 * 60 * 60 * 1000
  if (ms < earliest || ms > latest) return null
  return ms
}

function readSide(value: unknown): 'B' | 'S' | null {
  const side = readTrimmed(value).toUpperCase()
  if (side === 'BUY' || side === 'B' || side === 'LONG') return 'B'
  if (side === 'SELL' || side === 'S' || side === 'SHORT') return 'S'
  return null
}

/**
 * Validate one manual fill. `dryRun` defaults to true when omitted so a
 * partial request cannot write. Non-boolean `dryRun` is rejected.
 */
export function validateManualFillInput(input: unknown): 
  | { ok: true; value: ValidatedManualFill }
  | { ok: false; errors: ManualFillFieldError[] } {
  const payload = readObject(input)
  if (!payload) {
    return {
      ok: false,
      errors: [{ field: 'body', message: 'Manual fill input must be an object.' }],
    }
  }
  const errors: ManualFillFieldError[] = []
  const userId = readTrimmed(payload.userId)
  const accountNumber = readTrimmed(payload.accountNumber)
  const symbolRaw = readTrimmed(payload.symbol)
  const exchangeRaw = readTrimmed(payload.exchange)
  const note = readTrimmed(payload.note)
  const timestamp = readTrimmed(payload.timestamp)
  const side = readSide(payload.side)

  if (!userId || userId.length > 128) {
    errors.push({ field: 'userId', message: 'userId is required.' })
  }
  if (!accountNumber || accountNumber.length > 64) {
    errors.push({
      field: 'accountNumber',
      message: 'accountNumber is required.',
    })
  }
  if (!SYMBOL.test(symbolRaw)) {
    errors.push({
      field: 'symbol',
      message: 'symbol must be 1–32 letters, numbers, dots, underscores, or hyphens.',
    })
  }
  if (!SYMBOL.test(exchangeRaw)) {
    errors.push({
      field: 'exchange',
      message: 'exchange is required (for example CME).',
    })
  }
  if (!side) {
    errors.push({
      field: 'side',
      message: 'side must be buy or sell.',
    })
  }
  let qty: number | null = null
  if (typeof payload.qty !== 'number' || !Number.isSafeInteger(payload.qty) || payload.qty <= 0) {
    errors.push({ field: 'qty', message: 'qty must be an integer greater than 0.' })
  } else {
    qty = payload.qty
  }
  let price: number | null = null
  if (typeof payload.price !== 'number' || !Number.isFinite(payload.price) || payload.price === 0) {
    errors.push({
      field: 'price',
      message: 'price must be a non-zero finite number.',
    })
  } else {
    price = payload.price
  }
  const timestampMs = timestamp ? parseTimestamp(timestamp) : null
  if (!timestampMs) {
    errors.push({
      field: 'timestamp',
      message:
        'timestamp must be an ISO-8601 instant with a timezone (for example 2026-09-25T17:07:00+02:00) between 2000 and one day from now.',
    })
  }
  if (!note || note.length > 500) {
    errors.push({
      field: 'note',
      message: 'note (the reason for the patch) is required, up to 500 characters.',
    })
  }
  if ('dryRun' in payload && typeof payload.dryRun !== 'boolean') {
    errors.push({ field: 'dryRun', message: 'dryRun must be a boolean when provided.' })
  }
  if ('acknowledgeWarnings' in payload && typeof payload.acknowledgeWarnings !== 'boolean') {
    errors.push({
      field: 'acknowledgeWarnings',
      message: 'acknowledgeWarnings must be a boolean when provided.',
    })
  }
  if (
    errors.length > 0 ||
    !side ||
    qty == null ||
    price == null ||
    timestampMs == null
  ) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      userId,
      accountNumber,
      symbol: symbolRaw.toUpperCase(),
      exchange: exchangeRaw.toUpperCase(),
      side,
      qty,
      price,
      timestamp,
      timestampMs,
      note,
      dryRun: payload.dryRun === false ? false : true,
      acknowledgeWarnings: payload.acknowledgeWarnings === true,
    },
  }
}

function utcStamp(ms: number): {
  fillDate: string
  fillTime: string
  ssboe: number
  usecs: number
} {
  const at = new Date(ms)
  const fillDate = `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}${String(at.getUTCDate()).padStart(2, '0')}`
  const fillTime = `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}:${String(at.getUTCSeconds()).padStart(2, '0')}`
  const ssboe = Math.floor(ms / 1000)
  const usecs = (ms - ssboe * 1000) * 1000
  return { fillDate, fillTime, ssboe, usecs }
}

/** Stable id so the same patch submitted twice is one ledger row. The note is not part of the id. */
export function manualFillId(value: ValidatedManualFill): string {
  const payload = [
    value.userId,
    value.accountNumber,
    value.symbol,
    value.exchange,
    value.side,
    String(value.qty),
    String(value.price),
    String(value.timestampMs),
  ].join('|')
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 24)
  return `${MANUAL_FILL_ID_PREFIX}${hash}`
}

export function buildManualFill(value: ValidatedManualFill): RithmicProtocolFill {
  const clock = utcStamp(value.timestampMs)
  return {
    accountId: value.accountNumber,
    symbol: value.symbol,
    exchange: value.exchange,
    transactionType: value.side === 'B' ? 'BUY' : 'SELL',
    fillPrice: value.price,
    fillSize: value.qty,
    fillId: manualFillId(value),
    fillDate: clock.fillDate,
    fillTime: clock.fillTime,
    ssboe: clock.ssboe,
    usecs: clock.usecs,
    source: 'manual',
  }
}

function previewWarnings(
  stored: RithmicProtocolFill[],
  fill: RithmicProtocolFill,
): string[] {
  const withoutThis = stored.filter((row) => row.fillId !== fill.fillId)
  const book = prepareRithmicProtocolFills([...withoutThis, fill])
  const warnings: string[] = []
  const survived = book.fills.some(
    (row) => row.source === 'manual' && row.fillId === fill.fillId,
  )
  if (!survived) {
    warnings.push(
      'An upstream fill matches this manual fill. FIFO will use the upstream fill, so this patch will not add lots.',
    )
  }
  for (const miss of book.nearMisses) {
    if (miss.manual.fillId !== fill.fillId) continue
    warnings.push(
      `Near-miss with upstream fill ${miss.upstream.fillId ?? '(no id)'} (${miss.reason}). This symbol will not be derived while this near-miss stands. Confirm the manual distinct from that plant fill, or change the patch so it is not a near-miss.`,
    )
  }
  return warnings
}

function logManualFill(
  action: 'dry-run' | 'insert' | 'exists',
  value: ValidatedManualFill,
  fill: RithmicProtocolFill,
): void {
  console.info(
    `[RITHMIC-MANUAL-FILL] ${action} userId=${value.userId} account=${value.accountNumber} fillId=${fill.fillId ?? ''} symbol=${fill.symbol} side=${fill.transactionType} qty=${fill.fillSize} price=${fill.fillPrice} timestamp=${value.timestamp} note=${JSON.stringify(value.note)}`,
  )
}

async function defaultFindAccount(
  userId: string,
  accountNumber: string,
): Promise<{ id: string } | null> {
  return prisma.account.findFirst({
    where: { userId, number: accountNumber },
    select: { id: true },
  })
}

/**
 * Insert one manual fill for an account the user already has.
 * Repeating the same user, account, symbol, exchange, side, qty, price, and
 * timestamp is a no-op. `--dry-run` / `dryRun: true` (the default) writes nothing.
 * The note is required and written to the log; it is not a ledger column.
 */
export async function insertManualRithmicProtocolFill(
  input: unknown,
  deps?: Partial<ManualFillDeps>,
): Promise<ManualFillInsertResult> {
  const validated = validateManualFillInput(input)
  if (!validated.ok) {
    return { ok: false, status: 'validation', errors: validated.errors }
  }
  const value = validated.value
  const findAccount = deps?.findAccount ?? defaultFindAccount
  const loadFills = deps?.loadFills ?? loadRithmicProtocolFills
  const upsertFills = deps?.upsertFills ?? upsertRithmicProtocolFills

  const account = await findAccount(value.userId, value.accountNumber)
  if (!account) {
    return {
      ok: false,
      status: 'account_not_found',
      errors: [
        {
          field: 'accountNumber',
          message: 'No account with that number belongs to this user.',
        },
      ],
    }
  }

  const fill = buildManualFill(value)
  const identityKey = fillIdentityKey(fill)
  const stored = await loadFills({
    userId: value.userId,
    accountNumbers: [value.accountNumber],
  })
  const warnings = previewWarnings(stored, fill)
  for (const warning of warnings) {
    console.warn(`[RITHMIC-MANUAL-FILL] ${warning}`)
  }
  if (!value.dryRun && warnings.length > 0 && !value.acknowledgeWarnings) {
    return {
      ok: false,
      status: 'acknowledgement_required',
      errors: [
        {
          field: 'acknowledgeWarnings',
          message:
            'Apply refused because the preview has a near-miss or supersession warning. Pass acknowledgeWarnings: true to write anyway, or retire the manual fill.',
        },
      ],
      warnings,
    }
  }
  const existing = stored.find(
    (row) => fillIdentityKey(row) === identityKey || row.fillId === fill.fillId,
  )
  if (existing) {
    if (existing.source === 'manual' && existing.fillId === fill.fillId) {
      logManualFill('exists', value, existing)
      return {
        ok: true,
        dryRun: value.dryRun,
        idempotent: true,
        fillId: existing.fillId ?? fill.fillId ?? '',
        identityKey,
        note: value.note,
        fill: existing,
        warnings,
      }
    }
    return {
      ok: false,
      status: 'conflict',
      errors: [
        {
          field: 'fillId',
          message: 'A plant fill already uses this identity. Nothing was written.',
        },
      ],
    }
  }

  if (value.dryRun) {
    logManualFill('dry-run', value, fill)
    return {
      ok: true,
      dryRun: true,
      idempotent: false,
      fillId: fill.fillId ?? '',
      identityKey,
      note: value.note,
      fill,
      warnings,
    }
  }

  await upsertFills({
    userId: value.userId,
    fills: [fill],
    stored,
    accountIdByNumber: new Map([[value.accountNumber, account.id]]),
  })
  logManualFill('insert', value, fill)
  return {
    ok: true,
    dryRun: false,
    idempotent: false,
    fillId: fill.fillId ?? '',
    identityKey,
    note: value.note,
    fill,
    warnings,
  }
}

export type ManualFillDerivedTrade = {
  id: string
  entryId: string | null
  closeId: string | null
  instrument: string | null
  annotated: boolean
}

export type ManualFillTradeEffects = {
  displaced: number
  annotated: number
  /** The proposed marker still leaves a near-miss on this symbol, so sync will not derive a book. */
  nextBookBlocked: boolean
  /**
   * A near-miss remains somewhere on this account after the marker.
   * Sync skips reap for the whole account, so displaced rows stay until
   * that near-miss is resolved.
   */
  reapDeferred: boolean
}

export type ManualFillRetireResult =
  | {
      ok: true
      dryRun: boolean
      idempotent: boolean
      fillId: string
      source: 'manual-retired'
      retiredAt: string
      retiredBy: string
      retireReason: string
      trades: ManualFillDerivedTrade[]
    }
  | {
      ok: false
      status: 'validation' | 'not_found' | 'acknowledgement_required'
      errors: ManualFillFieldError[]
      trades?: ManualFillDerivedTrade[]
    }

type RetiredManualRow = {
  fillId: string
  source: string
  retiredAt?: Date | null
  retiredBy?: string | null
  retireReason?: string | null
}

type RetireDeps = {
  findManualFill: (params: {
    userId: string
    accountNumber: string
    fillId: string
  }) => Promise<RetiredManualRow | null>
  markRetired: (params: {
    userId: string
    accountNumber: string
    fillId: string
    retiredAt: Date
    retiredBy: string
    retireReason: string
  }) => Promise<void>
  findDerivedTrades: (params: {
    userId: string
    accountNumber: string
    fillId?: string
    fillIds?: string[]
    instrument?: string
  }) => Promise<ManualFillDerivedTrade[]>
}

async function defaultFindManualFill(params: {
  userId: string
  accountNumber: string
  fillId: string
}): Promise<RetiredManualRow | null> {
  const row = await prisma.rithmicProtocolFill.findFirst({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      fillId: params.fillId,
    },
    select: {
      fillId: true,
      source: true,
      retiredAt: true,
      retiredBy: true,
      retireReason: true,
    },
  })
  return row
}

function derivedTradeFillIds(params: { fillId?: string; fillIds?: string[] }): string[] {
  const ids = new Set<string>()
  if (params.fillId) ids.add(params.fillId)
  for (const id of params.fillIds ?? []) {
    if (id) ids.add(id)
  }
  return [...ids]
}

async function defaultFindDerivedTrades(params: {
  userId: string
  accountNumber: string
  fillId?: string
  fillIds?: string[]
  instrument?: string
}): Promise<ManualFillDerivedTrade[]> {
  const ids = derivedTradeFillIds(params)
  if (ids.length === 0) {
    const rows = await prisma.trade.findMany({
      where: {
        userId: params.userId,
        accountNumber: params.accountNumber,
        ...(params.instrument ? { instrument: params.instrument } : {}),
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
      select: {
        id: true,
        entryId: true,
        closeId: true,
        instrument: true,
        comment: true,
        tags: true,
        imageBase64: true,
        imageBase64Second: true,
        videoUrl: true,
        images: true,
        groupId: true,
      },
    })
    return rows.map((row) => ({
      id: row.id,
      entryId: row.entryId,
      closeId: row.closeId,
      instrument: row.instrument,
      annotated: hasTradeJournalAnnotations(row),
    }))
  }
  const leg = ids.length === 1 ? ids[0] : { in: ids }
  const rows = await prisma.trade.findMany({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      OR: [{ entryId: leg }, { closeId: leg }],
    },
    select: {
      id: true,
      entryId: true,
      closeId: true,
      instrument: true,
      comment: true,
      tags: true,
      imageBase64: true,
      imageBase64Second: true,
      videoUrl: true,
      images: true,
      groupId: true,
    },
  })
  return rows.map((row) => ({
    id: row.id,
    entryId: row.entryId,
    closeId: row.closeId,
    instrument: row.instrument,
    annotated: hasTradeJournalAnnotations(row),
  }))
}

async function defaultMarkRetired(params: {
  userId: string
  accountNumber: string
  fillId: string
  retiredAt: Date
  retiredBy: string
  retireReason: string
}): Promise<void> {
  await prisma.rithmicProtocolFill.updateMany({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      fillId: params.fillId,
      source: 'manual',
    },
    data: {
      source: 'manual-retired',
      retiredAt: params.retiredAt,
      retiredBy: params.retiredBy,
      retireReason: params.retireReason,
    },
  })
}

/**
 * Soft-retire one manual fill. Preview is the default. Retired rows stay in
 * the table and are ignored by reconcile, coverage, and sync.
 */
export async function retireManualRithmicProtocolFill(
  input: unknown,
  deps?: Partial<RetireDeps>,
): Promise<ManualFillRetireResult> {
  const payload = readObject(input)
  const errors: ManualFillFieldError[] = []
  if (!payload) {
    return {
      ok: false,
      status: 'validation',
      errors: [{ field: 'body', message: 'Retire input must be an object.' }],
    }
  }
  const userId = readTrimmed(payload.userId)
  const accountNumber = readTrimmed(payload.accountNumber)
  const fillId = readTrimmed(payload.fillId)
  const reason = readTrimmed(payload.reason)
  const retiredBy = readTrimmed(payload.retiredBy) || 'admin'
  if (!userId) errors.push({ field: 'userId', message: 'userId is required.' })
  if (!accountNumber) {
    errors.push({ field: 'accountNumber', message: 'accountNumber is required.' })
  }
  if (!fillId.startsWith('manual-')) {
    errors.push({
      field: 'fillId',
      message: 'fillId must be the manual- id of the row to retire.',
    })
  }
  if (!reason || reason.length > 500) {
    errors.push({
      field: 'reason',
      message: 'reason is required, up to 500 characters.',
    })
  }
  if ('dryRun' in payload && typeof payload.dryRun !== 'boolean') {
    errors.push({ field: 'dryRun', message: 'dryRun must be a boolean when provided.' })
  }
  if (
    'acknowledgeAnnotatedTrades' in payload &&
    typeof payload.acknowledgeAnnotatedTrades !== 'boolean'
  ) {
    errors.push({
      field: 'acknowledgeAnnotatedTrades',
      message: 'acknowledgeAnnotatedTrades must be a boolean when provided.',
    })
  }
  if (errors.length > 0) return { ok: false, status: 'validation', errors }
  const dryRun = payload.dryRun === false ? false : true
  const acknowledgeAnnotatedTrades = payload.acknowledgeAnnotatedTrades === true
  const findManualFill = deps?.findManualFill ?? defaultFindManualFill
  const markRetired = deps?.markRetired ?? defaultMarkRetired
  const findDerivedTrades = deps?.findDerivedTrades ?? defaultFindDerivedTrades
  const row = await findManualFill({ userId, accountNumber, fillId })
  if (!row) {
    return {
      ok: false,
      status: 'not_found',
      errors: [{ field: 'fillId', message: 'No manual fill with that id belongs to this account.' }],
    }
  }
  if (row.source !== 'manual' && row.source !== 'manual-retired') {
    return {
      ok: false,
      status: 'validation',
      errors: [{ field: 'fillId', message: 'Only a manual fill can be retired.' }],
    }
  }
  const trades = await findDerivedTrades({ userId, accountNumber, fillId })
  const annotated = trades.some((trade) => trade.annotated)
  if (!dryRun && annotated && !acknowledgeAnnotatedTrades) {
    return {
      ok: false,
      status: 'acknowledgement_required',
      errors: [
        {
          field: 'acknowledgeAnnotatedTrades',
          message:
            'Apply refused because a stored trade that uses this manual fill is annotated. Move the annotation if you want to keep it, delete the stored row, then run a sync or rebuild. Then re-send the retire.',
        },
      ],
      trades,
    }
  }
  if (row.source === 'manual-retired') {
    return {
      ok: true,
      dryRun,
      idempotent: true,
      fillId,
      source: 'manual-retired',
      retiredAt:
        row.retiredAt instanceof Date
          ? row.retiredAt.toISOString()
          : new Date().toISOString(),
      retiredBy: row.retiredBy || retiredBy,
      retireReason: row.retireReason || reason,
      trades,
    }
  }
  const retiredAt = new Date()
  if (!dryRun) {
    await markRetired({
      userId,
      accountNumber,
      fillId,
      retiredAt,
      retiredBy,
      retireReason: reason,
    })
    console.info(
      `[RITHMIC-MANUAL-FILL] retire userId=${userId} account=${accountNumber} fillId=${fillId} retiredBy=${retiredBy} reason=${JSON.stringify(reason)} trades=${trades.length}`,
    )
  }
  return {
    ok: true,
    dryRun,
    idempotent: false,
    fillId,
    source: 'manual-retired',
    retiredAt: retiredAt.toISOString(),
    retiredBy,
    retireReason: reason,
    trades,
  }
}

export type ManualFillDistinctRelation = ManualFillBookRelation

export type ManualFillDistinctResult =
  | {
      ok: true
      dryRun: boolean
      idempotent: boolean
      fillId: string
      upstreamFillId: string
      confirmedDistinctAt: string
      confirmedDistinctBy: string
      confirmDistinctReason: string
      relation: ManualFillDistinctRelation
      /** Deprecated scalar that was stored before this call. */
      previousConfirmedDistinctFillId: string | null
      /** Every plant id on the row before this call. */
      previousConfirmedDistinctFillIds: string[]
      /** Every plant id after this call. On a refusal, the list this call would write. */
      confirmedDistinctFillIds: string[]
      /** Plant ids this call appended. Empty when the call removes one id or changes nothing. */
      addedUpstreamFillIds: string[]
      /** Set when this call removes one id. */
      removedUpstreamFillId: string | null
      trades: ManualFillDerivedTrade[]
      tradeEffects: ManualFillTradeEffects
      /** Dry-run notes. Names a scalar that is not the last id, when that is the case. */
      warnings: string[]
    }
  | {
      ok: false
      status: 'validation' | 'not_found' | 'acknowledgement_required' | 'conflict' | 'bad_request'
      errors: ManualFillFieldError[]
      relation?: ManualFillDistinctRelation
      previousConfirmedDistinctFillId?: string | null
      previousConfirmedDistinctFillIds?: string[]
      confirmedDistinctFillIds?: string[]
      addedUpstreamFillIds?: string[]
      removedUpstreamFillId?: string | null
      trades?: ManualFillDerivedTrade[]
      tradeEffects?: ManualFillTradeEffects
    }

type DistinctRow = {
  fillId: string
  source: string
  accountNumber: string
  symbol: string
  transactionType: string
  fillPrice: number
  fillSize: number
  fillDate: string | null
  fillTime: string | null
  ssboe: number | null
  usecs: number | null
  basketId: string | null
  exchange: string | null
  sequenceNumber: string | null
  confirmedDistinctFillId: string | null
  confirmedDistinctFillIds?: string[] | null
  confirmedDistinctAudit?: unknown
  confirmedDistinctAt: Date | null
  confirmedDistinctBy: string | null
  confirmDistinctReason: string | null
}

const DISTINCT_FILL_SELECT = {
  fillId: true,
  source: true,
  accountNumber: true,
  symbol: true,
  transactionType: true,
  fillPrice: true,
  fillSize: true,
  fillDate: true,
  fillTime: true,
  ssboe: true,
  usecs: true,
  basketId: true,
  exchange: true,
  sequenceNumber: true,
  confirmedDistinctFillId: true,
  confirmedDistinctFillIds: true,
  confirmedDistinctAudit: true,
  confirmedDistinctAt: true,
  confirmedDistinctBy: true,
  confirmDistinctReason: true,
} as const

function distinctRowToFill(row: DistinctRow): RithmicProtocolFill {
  return rowToFill({
    accountNumber: row.accountNumber,
    accountId: null,
    identityKey: '',
    fillId: row.fillId,
    rawFillId: null,
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
    confirmedDistinctFillId: row.confirmedDistinctFillId,
    confirmedDistinctFillIds: row.confirmedDistinctFillIds ?? undefined,
  })
}

async function defaultFindDistinctFill(params: {
  userId: string
  accountNumber: string
  fillId: string
}): Promise<DistinctRow | null> {
  return prisma.rithmicProtocolFill.findFirst({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      fillId: params.fillId,
    },
    select: DISTINCT_FILL_SELECT,
  })
}

async function defaultLoadAccountFills(params: {
  userId: string
  accountNumber: string
}): Promise<DistinctRow[]> {
  return prisma.rithmicProtocolFill.findMany({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
    },
    select: DISTINCT_FILL_SELECT,
  })
}

function pickUpstreamFill(
  rows: DistinctRow[],
  manual: DistinctRow,
  upstreamFillId: string,
): DistinctRow | null {
  const sameId = rows.filter(
    (row) =>
      row.fillId === upstreamFillId &&
      row.source !== 'manual' &&
      row.source !== 'manual-retired' &&
      row.symbol.trim().toUpperCase() === manual.symbol.trim().toUpperCase() &&
      fillSide(row.transactionType) === fillSide(manual.transactionType),
  )
  if (sameId.length === 0) return null
  const manualDay = (manual.fillDate ?? '').replace(/-/g, '')
  return (
    sameId.find((row) => (row.fillDate ?? '').replace(/-/g, '') === manualDay) ??
    sameId[0]
  )
}

function auditSnapshot(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : []
}

/** Exact-match acknowledgements still on the list. Unparsable entries are ignored here and kept in the stored array. */
function exactAcknowledgedIds(
  audit: unknown,
  list: readonly string[],
  reclassified: ReadonlyArray<{ id: string; exact: boolean }>,
): string[] {
  const exact = new Set<string>()
  for (const item of auditSnapshot(audit)) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const fillId = canonicalRithmicFillId(typeof record.fillId === 'string' ? record.fillId : '')
    if (!fillId) continue
    if (record.op === 'add' && record.relation === 'exact') exact.add(fillId)
    if (record.op === 'remove') exact.delete(fillId)
  }
  for (const item of reclassified) {
    if (item.exact) exact.add(item.id)
    else exact.delete(item.id)
  }
  return list.filter((id) => exact.has(id))
}

/**
 * How one listed plant id relates to the manual on the current book.
 * Markers are ignored inside `manualFillBookRelation`, so a legacy exact
 * twin is still exact after it was confirmed.
 */
function relationToListedId(
  accountFills: DistinctRow[],
  manual: DistinctRow,
  book: RithmicProtocolFill[],
  fillId: string,
): ManualFillBookRelation | null {
  const upstream = pickUpstreamFill(accountFills, manual, fillId)
  if (!upstream) return null
  return manualFillBookRelation(book, manual.fillId, distinctRowToFill(upstream))
}

function relationLabel(relation: ManualFillBookRelation | null): string {
  if (!relation) return 'unknown'
  if (relation.kind === 'near-miss') return `near-miss (${relation.reason})`
  return relation.kind
}

/**
 * Ids prod can still supersede. An audit `add` of relation `exact` counts,
 * and so does an exact twin on the current book that has no audit relation
 * (a backfill or a confirm from before this list existed).
 */
function exactIdsOnProposedList(
  audit: unknown,
  ids: readonly string[],
  reclassified: ReadonlyArray<{ id: string; exact: boolean }>,
  accountFills: DistinctRow[],
  manual: DistinctRow,
  book: RithmicProtocolFill[],
): string[] {
  const exact = new Set(exactAcknowledgedIds(audit, ids, reclassified))
  for (const id of ids) {
    const relation = relationToListedId(accountFills, manual, book, id)
    if (relation?.kind === 'exact') exact.add(id)
  }
  return ids.filter((id) => exact.has(id))
}

function orderExactLast(
  ids: readonly string[],
  exactIds: readonly string[],
): { ok: true; ids: string[] } | { ok: false; exactIds: string[] } {
  const present = exactIds.filter((id) => ids.includes(id))
  if (present.length > 1) return { ok: false, exactIds: present }
  if (present.length === 0) return { ok: true, ids: [...ids] }
  const only = present[0]
  return { ok: true, ids: [...ids.filter((id) => id !== only), only] }
}

function twoExactRefusal(exactIds: readonly string[]): Extract<ManualFillDistinctResult, { ok: false }> {
  return {
    ok: false,
    status: 'bad_request',
    errors: [
      {
        field: 'confirmedDistinctFillIds',
        message: `Prod can protect only one exact-match confirmation. This row would keep ${exactIds.join(' and ')}. Remove one before confirming another.`,
      },
    ],
  }
}

function markerConflictRefusal(
  row: DistinctRow,
  relationLabelText: string | null,
): Extract<ManualFillDistinctResult, { ok: false }> {
  const conflict = distinctMarkerConflict(row)
  const scalar = conflict?.scalar ?? 'unset'
  const listed = listConfirmedDistinctFillIds(row)
  const outside = Boolean(conflict?.scalar && !listed.includes(conflict.scalar))
  const relationNote = conflict?.scalar
    ? ` Its relation to this manual is ${relationLabelText ?? 'unknown'}.`
    : ''
  const exactNote =
    outside && relationLabelText === 'exact'
      ? ' Pass acknowledgeExactMatch: true as well, because dropping this exact id lets both apps supersede the manual.'
      : ''
  return {
    ok: false,
    status: 'acknowledgement_required',
    previousConfirmedDistinctFillId: row.confirmedDistinctFillId,
    previousConfirmedDistinctFillIds: listed,
    errors: [
      {
        field: 'acknowledgeMarkerConflict',
        message: `confirmedDistinctFillId (${scalar}) is not the last id in confirmedDistinctFillIds.${relationNote}${exactNote} Pass acknowledgeMarkerConflict: true to rewrite it, or remove that scalar id.`,
      },
    ],
  }
}

function unchangedMarkerConflictRefusal(
  row: DistinctRow,
): Extract<ManualFillDistinctResult, { ok: false }> {
  const conflict = distinctMarkerConflict(row)
  const scalar = conflict?.scalar ?? 'unset'
  return {
    ok: false,
    status: 'acknowledgement_required',
    previousConfirmedDistinctFillId: row.confirmedDistinctFillId,
    previousConfirmedDistinctFillIds: listConfirmedDistinctFillIds(row),
    errors: [
      {
        field: 'markerConflictUnchanged',
        message: `confirmedDistinctFillId (${scalar}) is not the last id in confirmedDistinctFillIds, and this request adds no plant ids. Nothing was written, so the conflict stays.`,
      },
    ],
  }
}

function exactStrayScalarRefusal(
  row: DistinctRow,
  scalar: string,
  relation: Extract<ManualFillBookRelation, { kind: 'exact' }>,
  how: 'rewrite' | 'remove',
): Extract<ManualFillDistinctResult, { ok: false }> {
  const action =
    how === 'remove'
      ? 'Removing it drops that exact id'
      : 'Rewriting the scalar drops that exact id'
  return {
    ok: false,
    status: 'acknowledgement_required',
    relation,
    previousConfirmedDistinctFillId: row.confirmedDistinctFillId,
    previousConfirmedDistinctFillIds: listConfirmedDistinctFillIds(row),
    errors: [
      {
        field: 'acknowledgeExactMatch',
        message: `confirmedDistinctFillId (${scalar}) is an exact match and is not in confirmedDistinctFillIds. ${action}, and both apps then supersede this manual. Pass acknowledgeExactMatch: true to continue.`,
      },
    ],
  }
}

function markerConflictPreviewWarning(
  row: DistinctRow,
  relationLabelText: string | null,
): string | null {
  const conflict = distinctMarkerConflict(row)
  if (!conflict) return null
  const listed = listConfirmedDistinctFillIds(row)
  const listLabel = listed.join(', ') || 'empty'
  if (!conflict.scalar) {
    return `confirmedDistinctFillId is unset and is not the last id in confirmedDistinctFillIds (${listLabel}). Apply refuses unless acknowledgeMarkerConflict is true.`
  }
  const outside = !listed.includes(conflict.scalar)
  const exactNote =
    outside && relationLabelText === 'exact'
      ? ' Dropping it also requires acknowledgeExactMatch: true, because both apps would then supersede this manual.'
      : ''
  return `confirmedDistinctFillId (${conflict.scalar}) is ${relationLabelText ?? 'unknown'} relative to this manual and is not the last id in confirmedDistinctFillIds (${listLabel}).${exactNote} Apply refuses unless acknowledgeMarkerConflict is true.`
}

/** An out-of-list scalar that exactly matches the manual. Dropping it lets both apps supersede. */
function exactScalarOutsideList(
  row: DistinctRow,
  accountFills: DistinctRow[],
  book: RithmicProtocolFill[],
): { scalar: string; relation: Extract<ManualFillBookRelation, { kind: 'exact' }> } | null {
  const conflict = distinctMarkerConflict(row)
  if (!conflict?.scalar) return null
  if (listConfirmedDistinctFillIds(row).includes(conflict.scalar)) return null
  const relation = relationToListedId(accountFills, row, book, conflict.scalar)
  if (relation?.kind !== 'exact') return null
  return { scalar: conflict.scalar, relation }
}

function scalarRelationLabel(
  row: DistinctRow,
  accountFills: DistinctRow[],
  book: RithmicProtocolFill[],
): string | null {
  const conflict = distinctMarkerConflict(row)
  if (!conflict?.scalar) return null
  return relationLabel(relationToListedId(accountFills, row, book, conflict.scalar))
}

function markerSnapshot(row: {
  confirmedDistinctFillId?: string | null
  confirmedDistinctFillIds?: readonly string[] | null
  confirmedDistinctAudit?: unknown
}): { ids: string[]; scalar: string | null; audit: unknown[] } {
  return {
    ids: [...(row.confirmedDistinctFillIds ?? [])],
    scalar: row.confirmedDistinctFillId ?? null,
    audit: auditSnapshot(row.confirmedDistinctAudit),
  }
}

function legacyProvenance(row: DistinctRow): { at: string | null; by: string; reason: string } {
  const by = row.confirmedDistinctBy?.trim()
  const reason = row.confirmDistinctReason?.trim()
  return {
    at: row.confirmedDistinctAt instanceof Date ? row.confirmedDistinctAt.toISOString() : null,
    by: by ? row.confirmedDistinctBy ?? by : 'unknown',
    reason: reason ? row.confirmDistinctReason ?? reason : 'unknown',
  }
}

/** Ids already recorded as `add` or `legacy` are not seeded again. */
function idsMissingLegacySeed(row: DistinctRow, previousIds: readonly string[]): string[] {
  const covered = new Set<string>()
  for (const item of auditSnapshot(row.confirmedDistinctAudit)) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    if (record.op !== 'add' && record.op !== 'legacy') continue
    const fillId = canonicalRithmicFillId(typeof record.fillId === 'string' ? record.fillId : '')
    if (fillId) covered.add(fillId)
  }
  const consider: string[] = []
  const scalar = canonicalRithmicFillId(row.confirmedDistinctFillId)
  if (scalar && !previousIds.includes(scalar)) consider.push(scalar)
  for (const id of previousIds) consider.push(id)
  const ids: string[] = []
  for (const id of consider) {
    if (covered.has(id) || ids.includes(id)) continue
    ids.push(id)
  }
  return ids
}

function composeAudit(
  row: DistinctRow,
  previousIds: readonly string[],
  relationKindFor: (fillId: string) => string,
  entries: Array<Record<string, unknown>>,
): unknown[] {
  const existing = auditSnapshot(row.confirmedDistinctAudit)
  const provenance = legacyProvenance(row)
  const seeded = idsMissingLegacySeed(row, previousIds).map((fillId) => ({
    op: 'legacy' as const,
    fillId,
    at: provenance.at,
    by: provenance.by,
    reason: provenance.reason,
    relation: relationKindFor(fillId),
    scalar: row.confirmedDistinctFillId ?? null,
  }))
  return [...existing, ...seeded, ...entries]
}

async function defaultMarkDistinct(params: {
  userId: string
  accountNumber: string
  fillId: string
  /** Id this call added or removed. The persisted list is `confirmedDistinctFillIds`. */
  upstreamFillId: string
  confirmedDistinctFillIds: string[]
  /** List and scalar read before the gates. The write matches both or writes nothing. */
  expectedConfirmedDistinctFillIds: string[]
  expectedConfirmedDistinctFillId: string | null
  expectedConfirmedDistinctAudit: unknown[]
  confirmedDistinctAudit: unknown[]
  confirmedDistinctAt: Date
  confirmedDistinctBy: string
  confirmDistinctReason: string
}): Promise<number> {
  const confirmedDistinctFillIds = params.confirmedDistinctFillIds
  const written = await prisma.rithmicProtocolFill.updateMany({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      fillId: params.fillId,
      source: 'manual',
      confirmedDistinctFillIds: { equals: params.expectedConfirmedDistinctFillIds },
      confirmedDistinctFillId: params.expectedConfirmedDistinctFillId,
      confirmedDistinctAudit: {
        equals: params.expectedConfirmedDistinctAudit as Prisma.InputJsonValue,
      },
    },
    data: {
      confirmedDistinctFillIds,
      // Latest id in the list, or null once the list is empty.
      confirmedDistinctFillId: confirmedDistinctFillIds.at(-1) ?? null,
      confirmedDistinctAudit: params.confirmedDistinctAudit as Prisma.InputJsonValue,
      confirmedDistinctAt: params.confirmedDistinctAt,
      confirmedDistinctBy: params.confirmedDistinctBy,
      confirmDistinctReason: params.confirmDistinctReason,
    },
  })
  return written.count
}

function staleMarkerConflict(): Extract<ManualFillDistinctResult, { ok: false }> {
  return {
    ok: false,
    status: 'conflict',
    errors: [
      {
        field: 'confirmedDistinctFillIds',
        message:
          'This manual fill changed while the confirm was running. Nothing was written.',
      },
    ],
  }
}

function fillsOnInstrument(
  fills: RithmicProtocolFill[],
  symbol: string,
): RithmicProtocolFill[] {
  const instrument = normalizeInstrument(symbol)
  return fills.filter((fill) => normalizeInstrument(fill.symbol || '') === instrument)
}

function protocolPairKey(entry?: string | null, close?: string | null): string | null {
  const entryId = canonicalRithmicFillId(entry)
  const closeId = canonicalRithmicFillId(close)
  if (!entryId || !closeId) return null
  return `${entryId}|${closeId}`
}

/** Closed pairs sync would persist for this symbol, markers and all. */
function syncProtocolPairKeys(fills: RithmicProtocolFill[], userId: string): Set<string> {
  const prepared = prepareRithmicProtocolFills(fills)
  const { fifoFills } = planManualFillSyncEffects(prepared)
  const { trades } = buildTradesFromRithmicFills(fifoFills, userId, new Map())
  const keys = new Set<string>()
  for (const trade of trades) {
    const key = protocolPairKey(trade.entryId, trade.closeId)
    if (key) keys.add(key)
  }
  return keys
}

function withDistinctIds(
  fill: RithmicProtocolFill,
  ids: string[],
): RithmicProtocolFill {
  return {
    ...fill,
    confirmedDistinctFillIds: ids,
    confirmedDistinctFillId: ids.at(-1),
  }
}

/** Replace the manual's marker with the list this call would write, exact id last. */
function withConfirmedDistinctIds(
  fills: RithmicProtocolFill[],
  manualId: string,
  ids: readonly string[],
): RithmicProtocolFill[] {
  const manual = canonicalRithmicFillId(manualId)
  return fills.map((fill) => {
    if (!(fill.source === 'manual' && canonicalRithmicFillId(fill.fillId) === manual)) {
      return fill
    }
    return withDistinctIds(fill, [...ids])
  })
}

/** Sync blocks one raw contract, not the whole root. Key on the target symbol. */
function rawSymbolBlocked(fills: RithmicProtocolFill[], rawSymbol: string): boolean {
  const symbol = rawSymbol.trim().toUpperCase()
  if (!symbol) return false
  return prepareRithmicProtocolFills(fills).nearMisses.some(
    (miss) => (miss.manual.symbol || '').trim().toUpperCase() === symbol,
  )
}

/**
 * Stored trades on this instrument whose pair sync will not derive after the
 * marker is written. A near-miss blocks the whole symbol, so the current
 * derivation is empty and the stored rows are the baseline. When the book is
 * not blocked, a pair is listed only if sync derives it now.
 */
function displacedStoredTrades(
  stored: ManualFillDerivedTrade[],
  current: RithmicProtocolFill[],
  proposed: RithmicProtocolFill[],
  userId: string,
  instrument: string,
  rawSymbol: string,
): { trades: ManualFillDerivedTrade[]; nextBookBlocked: boolean } {
  const nowBlocked = rawSymbolBlocked(current, rawSymbol)
  const nextBookBlocked = rawSymbolBlocked(proposed, rawSymbol)
  const now = syncProtocolPairKeys(current, userId)
  const next = syncProtocolPairKeys(proposed, userId)
  const trades = stored
    .filter((trade) => normalizeInstrument(trade.instrument ?? '') === instrument)
    .filter((trade) => {
      const key = protocolPairKey(trade.entryId, trade.closeId)
      if (!key || next.has(key)) return false
      if (!nowBlocked && !now.has(key)) return false
      return true
    })
    .sort((left, right) => left.id.localeCompare(right.id))
  return { trades, nextBookBlocked }
}

/** Any remaining near-miss retains the whole account, so sync will not reap. */
function accountReapDeferred(proposedFills: RithmicProtocolFill[]): boolean {
  return prepareRithmicProtocolFills(proposedFills).nearMisses.length > 0
}

function readUpstreamFillIds(value: unknown): { ok: true; ids: string[] } | { ok: false } {
  if (value == null) return { ok: true, ids: [] }
  if (!Array.isArray(value)) return { ok: false }
  const ids: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return { ok: false }
    const trimmed = item.trim()
    if (trimmed) ids.push(trimmed)
  }
  return { ok: true, ids }
}

function uniqueStrings(ids: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return unique
}

type DistinctTarget = {
  namedFillId: string
  orderFillId: string
  relation: ManualFillBookRelation
}

function tradeEffectCounts(
  trades: ManualFillDerivedTrade[],
  nextBookBlocked: boolean,
  reapDeferred: boolean,
): ManualFillTradeEffects {
  return {
    displaced: trades.length,
    annotated: trades.filter((trade) => trade.annotated).length,
    nextBookBlocked,
    reapDeferred,
  }
}

/**
 * Mark one manual fill as a different execution from one or more plant fills.
 * Each call appends ids. An id already on the row is left in place.
 * Preview is the default. Reconcile then neither matches nor near-misses
 * any listed plant fill id, so those fills stay in the book.
 * `removeUpstreamFillId` drops one id and leaves the rest.
 */
export async function confirmDistinctManualRithmicProtocolFill(
  input: unknown,
  deps?: {
    findManualFill?: typeof defaultFindDistinctFill
    loadAccountFills?: typeof defaultLoadAccountFills
    markDistinct?: typeof defaultMarkDistinct
    findDerivedTrades?: typeof defaultFindDerivedTrades
  },
): Promise<ManualFillDistinctResult> {
  const payload = readObject(input)
  if (!payload) {
    return {
      ok: false,
      status: 'validation',
      errors: [{ field: 'body', message: 'Confirm-distinct input must be an object.' }],
    }
  }
  const errors: ManualFillFieldError[] = []
  const userId = readTrimmed(payload.userId)
  const accountNumber = readTrimmed(payload.accountNumber)
  const fillId = readTrimmed(payload.fillId)
  const upstreamFillId = readTrimmed(payload.upstreamFillId)
  const upstreamFillIdList = readUpstreamFillIds(payload.upstreamFillIds)
  const removing = 'removeUpstreamFillId' in payload
  const removeUpstreamFillId = readTrimmed(payload.removeUpstreamFillId)
  const reason = readTrimmed(payload.reason)
  const confirmedDistinctBy = readTrimmed(payload.confirmedDistinctBy) || 'admin'
  if (!userId) errors.push({ field: 'userId', message: 'userId is required.' })
  if (!accountNumber) {
    errors.push({ field: 'accountNumber', message: 'accountNumber is required.' })
  }
  if (!fillId.startsWith('manual-')) {
    errors.push({
      field: 'fillId',
      message: 'fillId must be the manual- id of the row to mark.',
    })
  }
  if (!upstreamFillIdList.ok) {
    errors.push({
      field: 'upstreamFillIds',
      message: 'upstreamFillIds must be an array of plant fill ids when provided.',
    })
  }
  const requestedIds = uniqueStrings([
    ...(upstreamFillId ? [upstreamFillId] : []),
    ...(upstreamFillIdList.ok ? upstreamFillIdList.ids : []),
  ])
  if (removing && (upstreamFillId || requestedIds.length > 0)) {
    errors.push({
      field: 'removeUpstreamFillId',
      message: 'Pass either upstreamFillId or removeUpstreamFillId, not both.',
    })
  } else if (removing && (!removeUpstreamFillId || removeUpstreamFillId.startsWith('manual-'))) {
    errors.push({
      field: 'removeUpstreamFillId',
      message: 'removeUpstreamFillId must be the plant fill id to drop from this manual row.',
    })
  } else if (!removing && (requestedIds.length === 0 || requestedIds.some((id) => id.startsWith('manual-')))) {
    errors.push({
      field: 'upstreamFillId',
      message: 'upstreamFillId must be the plant fill id this manual is distinct from.',
    })
  }
  if (!reason || reason.length > 500) {
    errors.push({
      field: 'reason',
      message: 'reason is required, up to 500 characters.',
    })
  }
  if ('dryRun' in payload && typeof payload.dryRun !== 'boolean') {
    errors.push({ field: 'dryRun', message: 'dryRun must be a boolean when provided.' })
  }
  if ('acknowledgeExactMatch' in payload && typeof payload.acknowledgeExactMatch !== 'boolean') {
    errors.push({
      field: 'acknowledgeExactMatch',
      message: 'acknowledgeExactMatch must be a boolean when provided.',
    })
  }
  if ('acknowledgeUnrelated' in payload && typeof payload.acknowledgeUnrelated !== 'boolean') {
    errors.push({
      field: 'acknowledgeUnrelated',
      message: 'acknowledgeUnrelated must be a boolean when provided.',
    })
  }
  if (
    'acknowledgeAnnotatedTrades' in payload &&
    typeof payload.acknowledgeAnnotatedTrades !== 'boolean'
  ) {
    errors.push({
      field: 'acknowledgeAnnotatedTrades',
      message: 'acknowledgeAnnotatedTrades must be a boolean when provided.',
    })
  }
  if ('acknowledgeReapDeferred' in payload && typeof payload.acknowledgeReapDeferred !== 'boolean') {
    errors.push({
      field: 'acknowledgeReapDeferred',
      message: 'acknowledgeReapDeferred must be a boolean when provided.',
    })
  }
  if ('acknowledgeMarkerConflict' in payload && typeof payload.acknowledgeMarkerConflict !== 'boolean') {
    errors.push({
      field: 'acknowledgeMarkerConflict',
      message: 'acknowledgeMarkerConflict must be a boolean when provided.',
    })
  }
  if (errors.length > 0) return { ok: false, status: 'validation', errors }
  const dryRun = payload.dryRun === false ? false : true
  const acknowledgeExactMatch = payload.acknowledgeExactMatch === true
  const acknowledgeUnrelated = payload.acknowledgeUnrelated === true
  const acknowledgeAnnotatedTrades = payload.acknowledgeAnnotatedTrades === true
  const acknowledgeReapDeferred = payload.acknowledgeReapDeferred === true
  const acknowledgeMarkerConflict = payload.acknowledgeMarkerConflict === true
  const findManualFill = deps?.findManualFill ?? defaultFindDistinctFill
  const loadAccountFills = deps?.loadAccountFills ?? defaultLoadAccountFills
  const markDistinct = deps?.markDistinct ?? defaultMarkDistinct
  const findDerivedTrades = deps?.findDerivedTrades ?? defaultFindDerivedTrades
  const row = await findManualFill({ userId, accountNumber, fillId })
  if (!row) {
    return {
      ok: false,
      status: 'not_found',
      errors: [{ field: 'fillId', message: 'No manual fill with that id belongs to this account.' }],
    }
  }
  if (row.source !== 'manual') {
    return {
      ok: false,
      status: 'validation',
      errors: [{ field: 'fillId', message: 'Only a manual fill can be marked distinct.' }],
    }
  }
  const previousIds = listConfirmedDistinctFillIds(row)
  const previousConfirmedDistinctFillId = row.confirmedDistinctFillId
  const accountFills = await loadAccountFills({ userId, accountNumber })
  const book = accountFills.map(distinctRowToFill)
  const instrument = normalizeInstrument(row.symbol)
  const symbolBook = fillsOnInstrument(book, row.symbol)
  const storedTrades = await findDerivedTrades({ userId, accountNumber, instrument })
  const effectsFor = (
    proposedSymbol: RithmicProtocolFill[],
    proposedAccount: RithmicProtocolFill[],
  ) => {
    const displaced = displacedStoredTrades(
      storedTrades,
      symbolBook,
      proposedSymbol,
      userId,
      instrument,
      row.symbol,
    )
    const reapDeferred = accountReapDeferred(proposedAccount)
    return {
      trades: displaced.trades,
      tradeEffects: tradeEffectCounts(
        displaced.trades,
        displaced.nextBookBlocked,
        reapDeferred,
      ),
    }
  }
  if (removing) {
    const removeId = canonicalRithmicFillId(removeUpstreamFillId) ?? ''
    const conflict = distinctMarkerConflict(row)
    const dropsStrayScalar =
      conflict != null && conflict.scalar === removeId && !previousIds.includes(removeId)
    if (!previousIds.includes(removeId) && !dropsStrayScalar) {
      return {
        ok: false,
        status: 'not_found',
        previousConfirmedDistinctFillId,
        previousConfirmedDistinctFillIds: previousIds,
        confirmedDistinctFillIds: previousIds,
        errors: [
          {
            field: 'removeUpstreamFillId',
            message: 'That plant fill id is not on this manual row.',
          },
        ],
      }
    }
    const unorderedIds = previousIds.filter((id) => id !== removeId)
    const ordered = orderExactLast(
      unorderedIds,
      exactIdsOnProposedList(row.confirmedDistinctAudit, unorderedIds, [], accountFills, row, book),
    )
    if (!ordered.ok) return twoExactRefusal(ordered.exactIds)
    const proposedIds = ordered.ids
    const removesConflictScalar = conflict != null && conflict.scalar === removeId
    const relationLabelText = scalarRelationLabel(row, accountFills, book)
    const strayExact = exactScalarOutsideList(row, accountFills, book)
    if (!dryRun && conflict && !acknowledgeMarkerConflict && !removesConflictScalar) {
      return markerConflictRefusal(row, relationLabelText)
    }
    if (!dryRun && strayExact && !acknowledgeExactMatch) {
      return exactStrayScalarRefusal(
        row,
        strayExact.scalar,
        strayExact.relation,
        dropsStrayScalar ? 'remove' : 'rewrite',
      )
    }
    const proposedSymbol = withConfirmedDistinctIds(symbolBook, fillId, proposedIds)
    const proposedAccount = withConfirmedDistinctIds(book, fillId, proposedIds)
    const { trades, tradeEffects } = effectsFor(proposedSymbol, proposedAccount)
    const removedUpstream = pickUpstreamFill(accountFills, row, removeUpstreamFillId)
    const relation: ManualFillDistinctRelation = removedUpstream
      ? manualFillBookRelation(book, fillId, distinctRowToFill(removedUpstream))
      : { kind: 'unrelated', orderFillId: removeId }
    const annotated = trades.some((trade) => trade.annotated)
    if (!dryRun && annotated && !acknowledgeAnnotatedTrades) {
      return {
        ok: false,
        status: 'acknowledgement_required',
        relation,
        previousConfirmedDistinctFillId,
        previousConfirmedDistinctFillIds: previousIds,
        confirmedDistinctFillIds: proposedIds,
        removedUpstreamFillId: removeId,
        trades,
        tradeEffects,
        errors: [
          {
            field: 'acknowledgeAnnotatedTrades',
            message:
              'Apply refused because a stored trade whose fill pair this marker removes is annotated. Move the annotation if you want to keep it, delete the stored row, then run a sync or rebuild. Then re-send confirm-distinct with acknowledgeAnnotatedTrades: true.',
          },
        ],
      }
    }
    if (!dryRun && tradeEffects.displaced > 0 && tradeEffects.reapDeferred && !acknowledgeReapDeferred) {
      return {
        ok: false,
        status: 'acknowledgement_required',
        relation,
        previousConfirmedDistinctFillId,
        previousConfirmedDistinctFillIds: previousIds,
        confirmedDistinctFillIds: proposedIds,
        removedUpstreamFillId: removeId,
        trades,
        tradeEffects,
        errors: [
          {
            field: 'acknowledgeReapDeferred',
            message:
              'Apply refused because another near-miss on this account keeps reap off. The next sync can insert the new pairs beside these displaced rows until that near-miss is resolved. Pass acknowledgeReapDeferred: true only if that double count is acceptable.',
          },
        ],
      }
    }
    const confirmedDistinctAt = new Date()
    if (!dryRun) {
      const written = await markDistinct({
        userId,
        accountNumber,
        fillId,
        upstreamFillId: removeId,
        confirmedDistinctFillIds: proposedIds,
        expectedConfirmedDistinctFillIds: markerSnapshot(row).ids,
        expectedConfirmedDistinctFillId: markerSnapshot(row).scalar,
        expectedConfirmedDistinctAudit: markerSnapshot(row).audit,
        confirmedDistinctAudit: composeAudit(
          row,
          previousIds,
          (id) => relationToListedId(accountFills, row, book, id)?.kind ?? 'unknown',
          [
            ...(conflict
              ? [
                  {
                    op: 'marker-conflict',
                    fillId: conflict.scalar ?? '',
                    scalar: conflict.scalar,
                    kept: proposedIds.at(-1) ?? null,
                    at: confirmedDistinctAt.toISOString(),
                    by: confirmedDistinctBy,
                    reason,
                  },
                ]
              : []),
            ...(dropsStrayScalar
              ? []
              : [
                  {
                    op: 'remove',
                    fillId: removeId,
                    at: confirmedDistinctAt.toISOString(),
                    by: confirmedDistinctBy,
                    reason,
                  },
                ]),
          ],
        ),
        confirmedDistinctAt,
        confirmedDistinctBy,
        confirmDistinctReason: reason,
      })
      if (written === 0) return staleMarkerConflict()
      console.info(
        `[RITHMIC-MANUAL-FILL] confirm-distinct remove userId=${userId} account=${accountNumber} fillId=${fillId} upstreamFillId=${removeId} by=${confirmedDistinctBy} reason=${JSON.stringify(reason)}`,
      )
    }
    const previewWarning = dryRun ? markerConflictPreviewWarning(row, relationLabelText) : null
    return {
      ok: true,
      dryRun,
      idempotent: false,
      fillId,
      upstreamFillId: removeId,
      confirmedDistinctAt: confirmedDistinctAt.toISOString(),
      confirmedDistinctBy,
      confirmDistinctReason: reason,
      relation,
      previousConfirmedDistinctFillId,
      previousConfirmedDistinctFillIds: previousIds,
      confirmedDistinctFillIds: proposedIds,
      addedUpstreamFillIds: [],
      removedUpstreamFillId: removeId,
      trades,
      tradeEffects,
      warnings: previewWarning ? [previewWarning] : [],
    }
  }
  const targets: DistinctTarget[] = []
  const seenOrders = new Set<string>()
  for (const named of requestedIds) {
    const upstream = pickUpstreamFill(accountFills, row, named)
    if (!upstream) {
      return {
        ok: false,
        status: 'not_found',
        previousConfirmedDistinctFillId,
        previousConfirmedDistinctFillIds: previousIds,
        confirmedDistinctFillIds: previousIds,
        errors: [
          {
            field: 'upstreamFillId',
            message:
              'No plant fill with that id, symbol, and side belongs to this account.',
          },
        ],
      }
    }
    const targetRelation = manualFillBookRelation(book, fillId, distinctRowToFill(upstream))
    if (seenOrders.has(targetRelation.orderFillId)) continue
    seenOrders.add(targetRelation.orderFillId)
    targets.push({
      namedFillId: named,
      orderFillId: targetRelation.orderFillId,
      relation: targetRelation,
    })
  }
  const orderIds = targets.map((target) => target.orderFillId)
  const addedUpstreamFillIds = orderIds.filter((id) => !previousIds.includes(id))
  const unorderedIds = [...previousIds]
  for (const id of orderIds) {
    if (!unorderedIds.includes(id)) unorderedIds.push(id)
  }
  const ordered = orderExactLast(
    unorderedIds,
    exactIdsOnProposedList(
      row.confirmedDistinctAudit,
      unorderedIds,
      targets.map((target) => ({
        id: target.orderFillId,
        exact: target.relation.kind === 'exact',
      })),
      accountFills,
      row,
      book,
    ),
  )
  if (!ordered.ok) return twoExactRefusal(ordered.exactIds)
  const proposedIds = ordered.ids
  const conflict = distinctMarkerConflict(row)
  const relationLabelText = scalarRelationLabel(row, accountFills, book)
  if (!dryRun && conflict && !acknowledgeMarkerConflict) {
    return markerConflictRefusal(row, relationLabelText)
  }
  const strayExact = exactScalarOutsideList(row, accountFills, book)
  if (!dryRun && strayExact && !acknowledgeExactMatch) {
    return exactStrayScalarRefusal(row, strayExact.scalar, strayExact.relation, 'rewrite')
  }
  const relation = targets[0].relation
  const orderFillId = targets[0].orderFillId
  const { trades, tradeEffects } = effectsFor(
    withConfirmedDistinctIds(symbolBook, fillId, proposedIds),
    withConfirmedDistinctIds(book, fillId, proposedIds),
  )
  const annotated = trades.some((trade) => trade.annotated)
  const exactTarget = targets.find((target) => target.relation.kind === 'exact')
  if (exactTarget && !dryRun && !acknowledgeExactMatch) {
    return {
      ok: false,
      status: 'acknowledgement_required',
      relation: exactTarget.relation,
      previousConfirmedDistinctFillId,
      previousConfirmedDistinctFillIds: previousIds,
      confirmedDistinctFillIds: proposedIds,
      addedUpstreamFillIds,
      errors: [
        {
          field: 'acknowledgeExactMatch',
          message:
            'That plant fill matches this manual exactly. Pass acknowledgeExactMatch: true only if both executions should count.',
        },
      ],
      trades,
      tradeEffects,
    }
  }
  const unrelatedTarget = targets.find((target) => target.relation.kind === 'unrelated')
  if (unrelatedTarget && !dryRun && !acknowledgeUnrelated) {
    return {
      ok: false,
      status: 'acknowledgement_required',
      relation: unrelatedTarget.relation,
      previousConfirmedDistinctFillId,
      previousConfirmedDistinctFillIds: previousIds,
      confirmedDistinctFillIds: proposedIds,
      addedUpstreamFillIds,
      errors: [
        {
          field: 'acknowledgeUnrelated',
          message:
            'That plant fill is unrelated to this manual. Pass acknowledgeUnrelated: true only if it should stay distinct anyway.',
        },
      ],
      trades,
      tradeEffects,
    }
  }
  if (!dryRun && annotated && !acknowledgeAnnotatedTrades) {
    return {
      ok: false,
      status: 'acknowledgement_required',
      relation,
      previousConfirmedDistinctFillId,
      previousConfirmedDistinctFillIds: previousIds,
      confirmedDistinctFillIds: proposedIds,
      addedUpstreamFillIds,
      trades,
      tradeEffects,
      errors: [
        {
          field: 'acknowledgeAnnotatedTrades',
          message:
            'Apply refused because a stored trade whose fill pair this marker removes is annotated. Move the annotation if you want to keep it, delete the stored row, then run a sync or rebuild. Then re-send confirm-distinct with acknowledgeAnnotatedTrades: true.',
        },
      ],
    }
  }
  if (!dryRun && tradeEffects.displaced > 0 && tradeEffects.reapDeferred && !acknowledgeReapDeferred) {
    return {
      ok: false,
      status: 'acknowledgement_required',
      relation,
      previousConfirmedDistinctFillId,
      previousConfirmedDistinctFillIds: previousIds,
      confirmedDistinctFillIds: proposedIds,
      addedUpstreamFillIds,
      trades,
      tradeEffects,
      errors: [
        {
          field: 'acknowledgeReapDeferred',
          message:
            'Apply refused because another near-miss on this account keeps reap off. The next sync can insert the new pairs beside these displaced rows until that near-miss is resolved. Pass acknowledgeReapDeferred: true only if that double count is acceptable.',
        },
      ],
    }
  }
  if (addedUpstreamFillIds.length === 0 && row.confirmedDistinctAt) {
    if (conflict) return unchangedMarkerConflictRefusal(row)
    return {
      ok: true,
      dryRun,
      idempotent: true,
      fillId,
      upstreamFillId: orderFillId,
      confirmedDistinctAt: row.confirmedDistinctAt.toISOString(),
      confirmedDistinctBy: row.confirmedDistinctBy || confirmedDistinctBy,
      confirmDistinctReason: row.confirmDistinctReason || reason,
      relation,
      previousConfirmedDistinctFillId,
      previousConfirmedDistinctFillIds: previousIds,
      confirmedDistinctFillIds: previousIds,
      addedUpstreamFillIds: [],
      removedUpstreamFillId: null,
      trades,
      tradeEffects,
      warnings: [],
    }
  }
  const confirmedDistinctAt = new Date()
  if (!dryRun) {
    const added = targets.filter((target) => !previousIds.includes(target.orderFillId))
    const written = await markDistinct({
      userId,
      accountNumber,
      fillId,
      upstreamFillId: addedUpstreamFillIds.at(-1) ?? orderFillId,
      confirmedDistinctFillIds: proposedIds,
      expectedConfirmedDistinctFillIds: markerSnapshot(row).ids,
      expectedConfirmedDistinctFillId: markerSnapshot(row).scalar,
      expectedConfirmedDistinctAudit: markerSnapshot(row).audit,
      confirmedDistinctAudit: composeAudit(
        row,
        previousIds,
        (id) => relationToListedId(accountFills, row, book, id)?.kind ?? 'unknown',
        [
          ...(conflict
            ? [
                {
                  op: 'marker-conflict',
                  fillId: conflict.scalar ?? '',
                  scalar: conflict.scalar,
                  kept: proposedIds.at(-1) ?? null,
                  at: confirmedDistinctAt.toISOString(),
                  by: confirmedDistinctBy,
                  reason,
                },
              ]
            : []),
          ...added.map((target) => ({
            op: 'add' as const,
            fillId: target.orderFillId,
            relation: target.relation.kind,
            at: confirmedDistinctAt.toISOString(),
            by: confirmedDistinctBy,
            reason,
          })),
        ],
      ),
      confirmedDistinctAt,
      confirmedDistinctBy,
      confirmDistinctReason: reason,
    })
    if (written === 0) return staleMarkerConflict()
    for (const target of added) {
      console.info(
        `[RITHMIC-MANUAL-FILL] confirm-distinct userId=${userId} account=${accountNumber} fillId=${fillId} upstreamFillId=${target.orderFillId} named=${target.namedFillId} by=${confirmedDistinctBy} reason=${JSON.stringify(reason)}`,
      )
    }
  }
  const previewWarning = dryRun ? markerConflictPreviewWarning(row, relationLabelText) : null
  return {
    ok: true,
    dryRun,
    idempotent: false,
    fillId,
    upstreamFillId: orderFillId,
    confirmedDistinctAt: confirmedDistinctAt.toISOString(),
    confirmedDistinctBy,
    confirmDistinctReason: reason,
    relation,
    previousConfirmedDistinctFillId,
    previousConfirmedDistinctFillIds: previousIds,
    confirmedDistinctFillIds: proposedIds,
    addedUpstreamFillIds,
    removedUpstreamFillId: null,
    trades,
    tradeEffects,
    warnings: previewWarning ? [previewWarning] : [],
  }
}

function plainDecimal(value: string | undefined, pattern: RegExp): number | null {
  if (!value || !pattern.test(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * CLI args for `scripts/insert-rithmic-manual-fill.ts`.
 * Omitting both flags, or passing `--dry-run`, previews. `--apply` writes.
 */
export function parseManualFillCliArgs(argv: string[]): 
  | { ok: true; command: 'insert' | 'retire' | 'confirm-distinct'; input: Record<string, unknown> }
  | { ok: false; errors: ManualFillFieldError[] } {
  let values: {
    'user-id'?: string
    account?: string
    symbol?: string
    exchange?: string
    side?: string
    qty?: string
    price?: string
    timestamp?: string
    note?: string
    'dry-run'?: boolean
    apply?: boolean
    'acknowledge-warnings'?: boolean
    'acknowledge-annotated-trades'?: boolean
    retire?: boolean
    'confirm-distinct'?: boolean
    remove?: boolean
    'acknowledge-exact-match'?: boolean
    'acknowledge-unrelated'?: boolean
    'acknowledge-reap-deferred'?: boolean
    'acknowledge-marker-conflict'?: boolean
    'fill-id'?: string
    'upstream-fill-id'?: string
    reason?: string
  }
  try {
    values = parseArgs({
      args: argv,
      options: {
        'user-id': { type: 'string' },
        account: { type: 'string' },
        symbol: { type: 'string' },
        exchange: { type: 'string' },
        side: { type: 'string' },
        qty: { type: 'string' },
        price: { type: 'string' },
        timestamp: { type: 'string' },
        note: { type: 'string' },
        'dry-run': { type: 'boolean' },
        apply: { type: 'boolean' },
        'acknowledge-warnings': { type: 'boolean' },
        'acknowledge-annotated-trades': { type: 'boolean' },
        retire: { type: 'boolean' },
        'confirm-distinct': { type: 'boolean' },
        remove: { type: 'boolean' },
        'acknowledge-exact-match': { type: 'boolean' },
        'acknowledge-unrelated': { type: 'boolean' },
        'acknowledge-reap-deferred': { type: 'boolean' },
        'acknowledge-marker-conflict': { type: 'boolean' },
        'fill-id': { type: 'string' },
        'upstream-fill-id': { type: 'string' },
        reason: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse arguments.'
    return { ok: false, errors: [{ field: 'args', message }] }
  }
  if (values.apply && values['dry-run']) {
    return {
      ok: false,
      errors: [
        {
          field: 'dryRun',
          message: 'Pass either --dry-run or --apply, not both.',
        },
      ],
    }
  }
  if (values.retire && (values['confirm-distinct'] || values.remove)) {
    return {
      ok: false,
      errors: [
        {
          field: 'command',
          message: 'Pass either --retire or --confirm-distinct, not both.',
        },
      ],
    }
  }
  if (values.remove && !values['confirm-distinct']) {
    return {
      ok: false,
      errors: [
        {
          field: 'remove',
          message: '--remove applies to --confirm-distinct.',
        },
      ],
    }
  }
  if (values['confirm-distinct']) {
    const named = values['upstream-fill-id']
    return {
      ok: true,
      command: 'confirm-distinct',
      input: {
        userId: values['user-id'],
        accountNumber: values.account,
        fillId: values['fill-id'],
        ...(values.remove
          ? { removeUpstreamFillId: named }
          : { upstreamFillId: named }),
        reason: values.reason,
        dryRun: values.apply ? false : true,
        acknowledgeExactMatch: values['acknowledge-exact-match'] === true,
        acknowledgeUnrelated: values['acknowledge-unrelated'] === true,
        acknowledgeAnnotatedTrades: values['acknowledge-annotated-trades'] === true,
        acknowledgeReapDeferred: values['acknowledge-reap-deferred'] === true,
        acknowledgeMarkerConflict: values['acknowledge-marker-conflict'] === true,
      },
    }
  }
  if (values.retire) {
    return {
      ok: true,
      command: 'retire',
      input: {
        userId: values['user-id'],
        accountNumber: values.account,
        fillId: values['fill-id'],
        reason: values.reason,
        dryRun: values.apply ? false : true,
        acknowledgeAnnotatedTrades: values['acknowledge-annotated-trades'] === true,
      },
    }
  }
  const qty = plainDecimal(values.qty, /^\d+$/)
  const price = plainDecimal(values.price, /^-?\d+(\.\d+)?$/)
  const errors: ManualFillFieldError[] = []
  if (values.qty !== undefined && qty == null) {
    errors.push({ field: 'qty', message: 'qty must be a positive integer.' })
  }
  if (values.price !== undefined && (price == null || price === 0)) {
    errors.push({ field: 'price', message: 'price must be a non-zero decimal number.' })
  }
  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    command: 'insert',
    input: {
      userId: values['user-id'],
      accountNumber: values.account,
      symbol: values.symbol,
      exchange: values.exchange,
      side: values.side,
      qty: qty ?? undefined,
      price: price ?? undefined,
      timestamp: values.timestamp,
      note: values.note,
      dryRun: values.apply ? false : true,
      acknowledgeWarnings: values['acknowledge-warnings'] === true,
    },
  }
}
