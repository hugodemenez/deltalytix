import { createHash } from 'node:crypto'
import { parseArgs } from 'node:util'
import { prisma } from '@/lib/prisma'
import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'
import { fillIdentityKey } from './dedupe-fills'
import {
  hasTradeJournalAnnotations,
  prepareRithmicProtocolFills,
} from './fill-ledger'
import {
  loadRithmicProtocolFills,
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
      `Near-miss with upstream fill ${miss.upstream.fillId ?? '(no id)'} (${miss.reason}). This symbol will not be derived until the patch matches exactly.`,
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
    fillId: string
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

async function defaultFindDerivedTrades(params: {
  userId: string
  accountNumber: string
  fillId: string
}): Promise<ManualFillDerivedTrade[]> {
  const rows = await prisma.trade.findMany({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      OR: [{ entryId: params.fillId }, { closeId: params.fillId }],
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
            'Apply refused because a stored trade that uses this manual fill is annotated. Move the annotation if you want to keep it, delete the stored row, then run a sync or rebuild.',
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
    }
  | {
      ok: false
      status: 'validation' | 'not_found'
      errors: ManualFillFieldError[]
    }

type DistinctRow = {
  fillId: string
  source: string
  confirmedDistinctFillId: string | null
  confirmedDistinctAt: Date | null
  confirmedDistinctBy: string | null
  confirmDistinctReason: string | null
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
    select: {
      fillId: true,
      source: true,
      confirmedDistinctFillId: true,
      confirmedDistinctAt: true,
      confirmedDistinctBy: true,
      confirmDistinctReason: true,
    },
  })
}

async function defaultMarkDistinct(params: {
  userId: string
  accountNumber: string
  fillId: string
  upstreamFillId: string
  confirmedDistinctAt: Date
  confirmedDistinctBy: string
  confirmDistinctReason: string
}): Promise<void> {
  await prisma.rithmicProtocolFill.updateMany({
    where: {
      userId: params.userId,
      accountNumber: params.accountNumber,
      fillId: params.fillId,
      source: 'manual',
    },
    data: {
      confirmedDistinctFillId: params.upstreamFillId,
      confirmedDistinctAt: params.confirmedDistinctAt,
      confirmedDistinctBy: params.confirmedDistinctBy,
      confirmDistinctReason: params.confirmDistinctReason,
    },
  })
}

/**
 * Mark one manual fill as a different execution from one plant fill.
 * Preview is the default. Reconcile then neither matches nor near-misses
 * that plant fill id, so both fills stay in the book.
 */
export async function confirmDistinctManualRithmicProtocolFill(
  input: unknown,
  deps?: {
    findManualFill?: typeof defaultFindDistinctFill
    markDistinct?: typeof defaultMarkDistinct
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
  if (!upstreamFillId || upstreamFillId.startsWith('manual-')) {
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
  if (errors.length > 0) return { ok: false, status: 'validation', errors }
  const dryRun = payload.dryRun === false ? false : true
  const findManualFill = deps?.findManualFill ?? defaultFindDistinctFill
  const markDistinct = deps?.markDistinct ?? defaultMarkDistinct
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
  if (row.confirmedDistinctFillId === upstreamFillId && row.confirmedDistinctAt) {
    return {
      ok: true,
      dryRun,
      idempotent: true,
      fillId,
      upstreamFillId,
      confirmedDistinctAt: row.confirmedDistinctAt.toISOString(),
      confirmedDistinctBy: row.confirmedDistinctBy || confirmedDistinctBy,
      confirmDistinctReason: row.confirmDistinctReason || reason,
    }
  }
  const confirmedDistinctAt = new Date()
  if (!dryRun) {
    await markDistinct({
      userId,
      accountNumber,
      fillId,
      upstreamFillId,
      confirmedDistinctAt,
      confirmedDistinctBy,
      confirmDistinctReason: reason,
    })
    console.info(
      `[RITHMIC-MANUAL-FILL] confirm-distinct userId=${userId} account=${accountNumber} fillId=${fillId} upstreamFillId=${upstreamFillId} by=${confirmedDistinctBy} reason=${JSON.stringify(reason)}`,
    )
  }
  return {
    ok: true,
    dryRun,
    idempotent: false,
    fillId,
    upstreamFillId,
    confirmedDistinctAt: confirmedDistinctAt.toISOString(),
    confirmedDistinctBy,
    confirmDistinctReason: reason,
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
  if (values.retire && values['confirm-distinct']) {
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
  if (values['confirm-distinct']) {
    return {
      ok: true,
      command: 'confirm-distinct',
      input: {
        userId: values['user-id'],
        accountNumber: values.account,
        fillId: values['fill-id'],
        upstreamFillId: values['upstream-fill-id'],
        reason: values.reason,
        dryRun: values.apply ? false : true,
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
