import type { PrismaClient } from '@/prisma/generated/prisma/client'
import {
  decryptJournalConversationResult,
  decryptJournalFieldResult,
  encryptJournalConversation,
  encryptJournalField,
  isJournalEncryptionWriteEnabled,
} from '@/lib/journal-field-crypto'

const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
])

function encryptStringOrSet(value: unknown): unknown {
  if (typeof value === 'string') return encryptJournalField(value)
  if (value && typeof value === 'object' && 'set' in value) {
    const rec = value as { set: unknown }
    if (typeof rec.set === 'string') {
      rec.set = encryptJournalField(rec.set)
    }
    return value
  }
  return value
}

function encryptConversationOrSet(value: unknown): unknown {
  if (value && typeof value === 'object' && 'set' in value && !Array.isArray(value)) {
    const rec = value as { set: unknown }
    rec.set = encryptJournalConversation(rec.set)
    return value
  }
  return encryptJournalConversation(value)
}

const SKIP_NESTED_WALK_KEYS = new Set([
  'where',
  'cursor',
  'orderBy',
  'select',
  'include',
  'omit',
  'connect',
  'disconnect',
  'delete',
  'deleteMany',
])

/**
 * Encrypt journal fields on write payloads, including `{ set }` and nested
 * `create` / `createMany` / `update` / `upsert` under relation keys.
 */
export function encryptWritePayload(data: unknown): void {
  if (!isJournalEncryptionWriteEnabled()) return
  if (data == null || typeof data !== 'object') return
  if (Array.isArray(data)) {
    for (const item of data) encryptWritePayload(item)
    return
  }

  const rec = data as Record<string, unknown>
  if (typeof rec.comment === 'string' || (rec.comment && typeof rec.comment === 'object')) {
    rec.comment = encryptStringOrSet(rec.comment)
  }
  if (
    typeof rec.journalContent === 'string' ||
    (rec.journalContent && typeof rec.journalContent === 'object')
  ) {
    rec.journalContent = encryptStringOrSet(rec.journalContent)
  }
  if (rec.conversation !== undefined) {
    rec.conversation = encryptConversationOrSet(rec.conversation)
  }

  for (const [key, value] of Object.entries(rec)) {
    if (
      key === 'comment' ||
      key === 'journalContent' ||
      key === 'conversation' ||
      SKIP_NESTED_WALK_KEYS.has(key)
    ) {
      continue
    }
    if (value && typeof value === 'object') {
      encryptWritePayload(value)
    }
  }
}

export function encryptWriteArgs(args: Record<string, unknown> | undefined): void {
  if (!args) return
  if (!isJournalEncryptionWriteEnabled()) return
  if (args.data !== undefined) encryptWritePayload(args.data)
  if (args.create !== undefined) encryptWritePayload(args.create)
  if (args.update !== undefined) encryptWritePayload(args.update)
}

function logDecryptFailure(field: string, rowId: unknown) {
  console.error('[journal-crypto] Failed to decrypt', {
    field,
    id: typeof rowId === 'string' || typeof rowId === 'number' ? rowId : undefined,
  })
}

function decryptStringColumn(
  row: Record<string, unknown>,
  field: 'comment' | 'journalContent',
  flag: 'commentUndecryptable' | 'journalContentUndecryptable',
  logName: string,
): void {
  if (row[flag] === true) {
    row[field] = null
    return
  }
  if (typeof row[field] !== 'string') return
  try {
    const result = decryptJournalFieldResult(row[field] as string)
    row[flag] = !result.ok
    if (result.ok) {
      row[field] = result.value
    } else {
      logDecryptFailure(logName, row.id)
      row[field] = null
    }
  } catch {
    logDecryptFailure(logName, row.id)
    row[flag] = true
    row[field] = null
  }
}

function decryptRowFields(row: Record<string, unknown>): void {
  decryptStringColumn(row, 'comment', 'commentUndecryptable', 'trade.comment')
  decryptStringColumn(
    row,
    'journalContent',
    'journalContentUndecryptable',
    'mood.journalContent',
  )
  if (row.conversationUndecryptable === true) {
    row.conversation = null
    return
  }
  if (row.conversation === undefined) return
  try {
    const result = decryptJournalConversationResult(row.conversation)
    row.conversationUndecryptable = !result.ok
    if (result.ok) {
      row.conversation = result.value
    } else {
      logDecryptFailure('mood.conversation', row.id)
      row.conversation = null
    }
  } catch {
    logDecryptFailure('mood.conversation', row.id)
    row.conversationUndecryptable = true
    row.conversation = null
  }
}

/**
 * Decrypt journal fields on a query result, including nested `include`/`select`
 * relation rows. One bad ciphertext cannot fail the whole response.
 */
export function decryptResultTree(result: unknown): unknown {
  if (result == null || typeof result !== 'object') return result
  if (Array.isArray(result)) {
    for (const item of result) decryptResultTree(item)
    return result
  }

  const rec = result as Record<string, unknown>
  if ('count' in rec && !('id' in rec) && !('comment' in rec) && !('journalContent' in rec)) {
    return result
  }

  decryptRowFields(rec)
  for (const [key, value] of Object.entries(rec)) {
    if (key === 'comment' || key === 'journalContent' || key === 'conversation') continue
    decryptResultTree(value)
  }
  return result
}

/**
 * Transparent AES-256-GCM for Mood journal/conversation and Trade.comment.
 * One decrypt layer: the query hook tree-walks results (including nested
 * includes). Prisma `result` computes are intentionally not used — they ran
 * before the hook and nulled unread ciphertext, so a second decrypt of `null`
 * reset `*Undecryptable` to false.
 */
export function withJournalFieldEncryption<T extends PrismaClient>(client: T): T {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          if (WRITE_OPERATIONS.has(operation)) {
            encryptWriteArgs(args as Record<string, unknown>)
          }
          const result = await query(args)
          return decryptResultTree(result)
        },
      },
    },
  }) as unknown as T
}
