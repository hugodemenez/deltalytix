import type { PrismaClient } from '@/prisma/generated/prisma/client'
import {
  decryptJournalConversationSafe,
  decryptJournalFieldSafe,
  encryptJournalConversation,
  encryptJournalField,
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
  if (args.data !== undefined) encryptWritePayload(args.data)
  if (args.create !== undefined) encryptWritePayload(args.create)
  if (args.update !== undefined) encryptWritePayload(args.update)
}

function decryptRowFields(row: Record<string, unknown>): void {
  if (typeof row.comment === 'string') {
    row.comment = decryptJournalFieldSafe(row.comment, row.id, 'trade.comment')
  }
  if (typeof row.journalContent === 'string') {
    row.journalContent = decryptJournalFieldSafe(
      row.journalContent,
      row.id,
      'mood.journalContent',
    )
  }
  if (row.conversation !== undefined) {
    row.conversation = decryptJournalConversationSafe(row.conversation, row.id)
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
 * Query hooks cover nested writes; result extensions + tree walk cover includes.
 */
export function withJournalFieldEncryption<T extends PrismaClient>(client: T): T {
  return client.$extends({
    result: {
      trade: {
        comment: {
          needs: { comment: true, id: true },
          compute(row) {
            return decryptJournalFieldSafe(row.comment, row.id, 'trade.comment')
          },
        },
      },
      mood: {
        journalContent: {
          needs: { journalContent: true, id: true },
          compute(row) {
            return decryptJournalFieldSafe(row.journalContent, row.id, 'mood.journalContent')
          },
        },
        conversation: {
          needs: { conversation: true, id: true },
          compute(row) {
            return decryptJournalConversationSafe(row.conversation, row.id)
          },
        },
      },
    },
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
