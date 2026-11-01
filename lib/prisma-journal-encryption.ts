import type { PrismaClient } from '@/prisma/generated/prisma/client'
import {
  decryptJournalConversation,
  decryptJournalField,
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

function encryptTradeData(data: unknown): void {
  if (data == null) return
  if (Array.isArray(data)) {
    for (const item of data) encryptTradeData(item)
    return
  }
  if (typeof data !== 'object') return
  const rec = data as Record<string, unknown>
  if (typeof rec.comment === 'string') {
    rec.comment = encryptJournalField(rec.comment)
  }
}

function encryptMoodData(data: unknown): void {
  if (data == null) return
  if (Array.isArray(data)) {
    for (const item of data) encryptMoodData(item)
    return
  }
  if (typeof data !== 'object') return
  const rec = data as Record<string, unknown>
  if (typeof rec.journalContent === 'string') {
    rec.journalContent = encryptJournalField(rec.journalContent)
  }
  if (rec.conversation !== undefined) {
    rec.conversation = encryptJournalConversation(rec.conversation)
  }
}

function encryptArgs(
  args: Record<string, unknown> | undefined,
  encryptData: (data: unknown) => void,
): void {
  if (!args) return
  if (args.data !== undefined) encryptData(args.data)
  if (args.create !== undefined) encryptData(args.create)
  if (args.update !== undefined) encryptData(args.update)
}

function decryptTradeRow(row: Record<string, unknown>): void {
  if (typeof row.comment === 'string') {
    row.comment = decryptJournalField(row.comment)
  }
}

function decryptMoodRow(row: Record<string, unknown>): void {
  if (typeof row.journalContent === 'string') {
    row.journalContent = decryptJournalField(row.journalContent)
  }
  if (row.conversation !== undefined) {
    row.conversation = decryptJournalConversation(row.conversation)
  }
}

function decryptResult(
  result: unknown,
  decryptRow: (row: Record<string, unknown>) => void,
): unknown {
  if (result == null) return result
  if (Array.isArray(result)) {
    for (const item of result) {
      if (item && typeof item === 'object') {
        decryptRow(item as Record<string, unknown>)
      }
    }
    return result
  }
  if (typeof result === 'object' && result !== null) {
    const rec = result as Record<string, unknown>
    if ('count' in rec && !('id' in rec)) return result
    decryptRow(rec)
  }
  return result
}

/**
 * Transparent AES-256-GCM for Mood journal/conversation and Trade.comment.
 * Writes store `jrn:v1:` blobs; reads return plaintext to the app.
 */
export function withJournalFieldEncryption<T extends PrismaClient>(client: T): T {
  return client.$extends({
    query: {
      trade: {
        async $allOperations({ operation, args, query }) {
          if (WRITE_OPERATIONS.has(operation)) {
            encryptArgs(args as Record<string, unknown>, encryptTradeData)
          }
          const result = await query(args)
          return decryptResult(result, decryptTradeRow)
        },
      },
      mood: {
        async $allOperations({ operation, args, query }) {
          if (WRITE_OPERATIONS.has(operation)) {
            encryptArgs(args as Record<string, unknown>, encryptMoodData)
          }
          const result = await query(args)
          return decryptResult(result, decryptMoodRow)
        },
      },
    },
  }) as unknown as T
}
