/**
 * Encrypt plaintext journal / note fields at rest (AES-256-GCM).
 *
 * Safe to re-run: valid `jrn:v1:` ciphertext is skipped.
 * Writes are conditional on the original field value so a concurrent edit is
 * not overwritten.
 *
 * Fields:
 *   - Mood.journalContent
 *   - Mood.conversation
 *   - Trade.comment
 *
 * Prerequisites:
 *   - JOURNAL_ENCRYPTION_KEY (32-byte hex or base64). Production/preview
 *     refuse ENCRYPTION_KEY fallback and committed placeholders.
 *   - DATABASE_URL / DIRECT_URL pointing at the target DB
 *
 * Usage:
 *   bun run migrate:encrypt-journal-fields
 *   bun run migrate:encrypt-journal-fields -- --dry-run
 */
import { loadEnvLocal } from '@/lib/load-env-local.node'
import { PrismaClient, type Prisma } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  encryptJournalConversation,
  encryptJournalField,
  hasJournalEncryptionKey,
  isPrismaJsonNullInput,
  isValidJournalCiphertext,
} from '@/lib/journal-field-crypto'

loadEnvLocal()

const dryRun = process.argv.includes('--dry-run')
const PAGE_SIZE = 500

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
// Unextended client so we can see ciphertext vs plaintext on disk.
const prisma = new PrismaClient({ adapter })

function databaseHost(url: string | undefined): string {
  if (!url) return '(missing DATABASE_URL)'
  try {
    return new URL(url).host
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

function conversationNeedsEncrypt(value: unknown): boolean {
  if (isPrismaJsonNullInput(value)) return false
  if (typeof value === 'string') {
    if (value === '' || value === 'null' || value === '{}') return false
    return !isValidJournalCiphertext(value)
  }
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return false
  }
  return true
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}

async function paginate<T extends { id: string }>(
  fetchPage: (cursor: string | undefined) => Promise<T[]>,
  onRow: (row: T) => Promise<void>,
): Promise<number> {
  let cursor: string | undefined
  let total = 0
  for (;;) {
    const rows = await fetchPage(cursor)
    if (rows.length === 0) break
    for (const row of rows) {
      await onRow(row)
    }
    total += rows.length
    if (rows.length < PAGE_SIZE) break
    cursor = rows[rows.length - 1]?.id
  }
  return total
}

async function migrateMoods() {
  let journalEncrypted = 0
  let conversationEncrypted = 0
  let skipped = 0
  let concurrentSkip = 0
  let failed = 0

  const total = await paginate(
    (cursor) =>
      prisma.mood.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: { id: true, journalContent: true, conversation: true },
      }),
    async (row) => {
      const data: Prisma.MoodUpdateInput = {}
      const where: Prisma.MoodWhereInput = { id: row.id }

      if (row.journalContent && !isValidJournalCiphertext(row.journalContent)) {
        data.journalContent = encryptJournalField(row.journalContent)
        where.journalContent = row.journalContent
      }

      if (conversationNeedsEncrypt(row.conversation)) {
        const encrypted = encryptJournalConversation(row.conversation)
        if (typeof encrypted === 'string') {
          data.conversation = encrypted
          where.conversation = {
            equals: row.conversation as Prisma.InputJsonValue,
          }
        }
      }

      if (Object.keys(data).length === 0) {
        skipped += 1
        return
      }

      if ('journalContent' in data) journalEncrypted += 1
      if ('conversation' in data) conversationEncrypted += 1

      if (dryRun) return

      try {
        const result = await prisma.mood.updateMany({
          where,
          data,
        })
        if (result.count === 0) {
          concurrentSkip += 1
        }
      } catch (error) {
        failed += 1
        console.error('[migrate-encrypt-journal-fields] mood write failed', {
          id: row.id,
          message: safeErrorMessage(error),
        })
      }
    },
  )

  return {
    total,
    journalEncrypted,
    conversationEncrypted,
    skipped,
    concurrentSkip,
    failed,
  }
}

async function migrateTradeComments() {
  let migrated = 0
  let alreadyEncrypted = 0
  let skippedEmpty = 0
  let concurrentSkip = 0
  let failed = 0

  const total = await paginate(
    (cursor) =>
      prisma.trade.findMany({
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        where: { comment: { not: null } },
        select: { id: true, comment: true },
      }),
    async (row) => {
      if (!row.comment) {
        skippedEmpty += 1
        return
      }
      if (isValidJournalCiphertext(row.comment)) {
        alreadyEncrypted += 1
        return
      }

      const encrypted = encryptJournalField(row.comment)
      if (!encrypted) {
        skippedEmpty += 1
        return
      }

      migrated += 1
      if (dryRun) return

      try {
        const result = await prisma.trade.updateMany({
          where: { id: row.id, comment: row.comment },
          data: { comment: encrypted },
        })
        if (result.count === 0) {
          concurrentSkip += 1
        }
      } catch (error) {
        failed += 1
        console.error('[migrate-encrypt-journal-fields] trade write failed', {
          id: row.id,
          message: safeErrorMessage(error),
        })
      }
    },
  )

  return {
    scannedWithComment: total,
    migrated,
    alreadyEncrypted,
    skippedEmpty,
    concurrentSkip,
    failed,
  }
}

async function main() {
  if (!hasJournalEncryptionKey()) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY is missing, a placeholder, or not a 32-byte hex/base64 key. Generate with: openssl rand -hex 32',
    )
  }

  console.log(
    `[migrate-encrypt-journal-fields] Starting${dryRun ? ' (dry-run)' : ''}…`,
  )
  console.log(
    `[migrate-encrypt-journal-fields] Target database host: ${databaseHost(process.env.DATABASE_URL)}`,
  )

  const moods = await migrateMoods()
  const trades = await migrateTradeComments()

  console.log('[migrate-encrypt-journal-fields] Done', {
    moods,
    trades,
    dryRun,
  })
}

main()
  .catch((error) => {
    console.error('[migrate-encrypt-journal-fields] Failed:', safeErrorMessage(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
