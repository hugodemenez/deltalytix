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

function decryptRowFields(row: Record<string, unknown>): void {
  if (typeof row.comment === 'string') {
    try {
      const result = decryptJournalFieldResult(row.comment)
      row.commentUndecryptable = !result.ok
      if (result.ok) {
        row.comment = result.value
      } else {
        logDecryptFailure('trade.comment', row.id)
        row.comment = null
      }
    } catch {
      logDecryptFailure('trade.comment', row.id)
      row.commentUndecryptable = true
      row.comment = null
    }
  }
  if (typeof row.journalContent === 'string') {
    try {
      const result = decryptJournalFieldResult(row.journalContent)
      row.journalContentUndecryptable = !result.ok
      if (result.ok) {
        row.journalContent = result.value
      } else {
        logDecryptFailure('mood.journalContent', row.id)
        row.journalContent = null
      }
    } catch {
      logDecryptFailure('mood.journalContent', row.id)
      row.journalContentUndecryptable = true
      row.journalContent = null
    }
  }
  if (row.conversation !== undefined) {
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
            try {
              const result = decryptJournalFieldResult(row.comment)
              if (result.ok) return result.value
            } catch {
              // missing key on ciphertext
            }
            logDecryptFailure('trade.comment', row.id)
            return null
          },
        },
        commentUndecryptable: {
          needs: { comment: true, id: true },
          compute(row) {
            try {
              return !decryptJournalFieldResult(row.comment).ok
            } catch {
              return Boolean(row.comment)
            }
          },
        },
      },
      mood: {
        journalContent: {
          needs: { journalContent: true, id: true },
          compute(row) {
            try {
              const result = decryptJournalFieldResult(row.journalContent)
              if (result.ok) return result.value
            } catch {
              // missing key on ciphertext
            }
            logDecryptFailure('mood.journalContent', row.id)
            return null
          },
        },
        journalContentUndecryptable: {
          needs: { journalContent: true, id: true },
          compute(row) {
            try {
              return !decryptJournalFieldResult(row.journalContent).ok
            } catch {
              return Boolean(row.journalContent)
            }
          },
        },
        conversation: {
          needs: { conversation: true, id: true },
          compute(row) {
            try {
              const result = decryptJournalConversationResult(row.conversation)
              if (result.ok) return result.value
            } catch {
              // missing key on ciphertext
            }
            logDecryptFailure('mood.conversation', row.id)
            return null
          },
        },
        conversationUndecryptable: {
          needs: { conversation: true, id: true },
          compute(row) {
            try {
              return !decryptJournalConversationResult(row.conversation).ok
            } catch {
              return row.conversation != null
            }
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
