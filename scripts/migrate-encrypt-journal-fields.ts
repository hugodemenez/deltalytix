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
 *   - JOURNAL_ENCRYPTION_KEY must be an exact 32-byte hex or base64 key.
 *     ENCRYPTION_KEY fallback and placeholders are never accepted here.
 *   - Samples several jrn:v1 rows from journalContent, conversation, and
 *     comment, prints a key fingerprint, and decrypts them before writing.
 *     A wrong key aborts. If no ciphertext exists, pass
 *     --allow-no-ciphertext-sample.
 *   - DATABASE_URL / DIRECT_URL pointing at the target DB
 *
 * Usage:
 *   bun run migrate:encrypt-journal-fields
 *   bun run migrate:encrypt-journal-fields -- --dry-run
 *   bun run migrate:encrypt-journal-fields -- --rekey
 *   bun run migrate:encrypt-journal-fields -- --allow-no-ciphertext-sample
 */
import { loadEnvLocal } from '@/lib/load-env-local.node'
import { Prisma, PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  JOURNAL_FIELD_ENC_PREFIX,
  assertBackfillCanDecryptSamples,
  decryptJournalConversation,
  decryptJournalField,
  encryptJournalConversation,
  encryptJournalField,
  isPrismaJsonNullInput,
  isValidJournalCiphertext,
  journalEncryptionKeyFingerprint,
  requireExact32ByteJournalKey,
  shouldRekeyStoredField,
} from '@/lib/journal-field-crypto'

loadEnvLocal()

const dryRun = process.argv.includes('--dry-run')
const rekey = process.argv.includes('--rekey')
const allowNoCiphertextSample = process.argv.includes('--allow-no-ciphertext-sample')
const PAGE_SIZE = 500
const encryptOpts = { force: true } as const

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
        data.journalContent = encryptJournalField(row.journalContent, encryptOpts)
        where.journalContent = row.journalContent
      } else if (rekey && shouldRekeyStoredField(row.journalContent)) {
        data.journalContent = encryptJournalField(
          decryptJournalField(row.journalContent),
          encryptOpts,
        )
        where.journalContent = row.journalContent
      }

      const conversationCipher =
        typeof row.conversation === 'string' ? row.conversation : null
      if (conversationNeedsEncrypt(row.conversation)) {
        const encrypted = encryptJournalConversation(row.conversation, encryptOpts)
        if (typeof encrypted === 'string') {
          data.conversation = encrypted
          where.conversation = {
            equals: row.conversation as Prisma.InputJsonValue,
          }
        }
      } else if (rekey && shouldRekeyStoredField(conversationCipher)) {
        const decrypted = decryptJournalConversation(row.conversation)
        const encrypted = encryptJournalConversation(decrypted, encryptOpts)
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
        if (rekey && shouldRekeyStoredField(row.comment)) {
          const encrypted = encryptJournalField(
            decryptJournalField(row.comment),
            encryptOpts,
          )
          migrated += 1
          if (dryRun) return
          try {
            const result = await prisma.trade.updateMany({
              where: { id: row.id, comment: row.comment },
              data: { comment: encrypted },
            })
            if (result.count === 0) concurrentSkip += 1
          } catch (error) {
            failed += 1
            console.error('[migrate-encrypt-journal-fields] trade rekey failed', {
              id: row.id,
              message: safeErrorMessage(error),
            })
          }
          return
        }
        alreadyEncrypted += 1
        return
      }

      const encrypted = encryptJournalField(row.comment, encryptOpts)
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

function collectCiphertext(values: unknown[], limit = 8): string[] {
  const out: string[] = []
  for (const value of values) {
    if (typeof value === 'string' && isValidJournalCiphertext(value)) {
      out.push(value)
      if (out.length >= limit) break
    }
  }
  return out
}

async function sampleStoredCiphertext(): Promise<string[]> {
  const [journalRows, conversationRows, commentRows] = await Promise.all([
    prisma.mood.findMany({
      where: { journalContent: { startsWith: JOURNAL_FIELD_ENC_PREFIX } },
      take: 8,
      select: { journalContent: true },
    }),
    prisma.mood.findMany({
      where: { conversation: { not: Prisma.DbNull } },
      take: 32,
      select: { conversation: true },
    }),
    prisma.trade.findMany({
      where: { comment: { startsWith: JOURNAL_FIELD_ENC_PREFIX } },
      take: 8,
      select: { comment: true },
    }),
  ])
  return [
    ...collectCiphertext(journalRows.map((row) => row.journalContent)),
    ...collectCiphertext(conversationRows.map((row) => row.conversation)),
    ...collectCiphertext(commentRows.map((row) => row.comment)),
  ]
}

async function main() {
  requireExact32ByteJournalKey()
  const fingerprint = journalEncryptionKeyFingerprint()
  console.log(
    `[migrate-encrypt-journal-fields] JOURNAL_ENCRYPTION_KEY fingerprint: ${fingerprint}`,
  )

  const samples = await sampleStoredCiphertext()
  const proof = assertBackfillCanDecryptSamples(samples, {
    allowNoCiphertextSample,
  })
  console.log(
    `[migrate-encrypt-journal-fields] Ciphertext samples decrypted: ${proof.ciphertextSamples}`,
  )

  console.log(
    `[migrate-encrypt-journal-fields] Starting${dryRun ? ' (dry-run)' : ''}${rekey ? ' (rekey)' : ''}…`,
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
