/**
 * Encrypt plaintext journal / note fields at rest (AES-256-GCM).
 *
 * Safe to re-run: already-encrypted values (`jrn:v1:…`) are skipped.
 * Decrypt remains compatible with legacy plaintext until every row is migrated.
 *
 * Fields:
 *   - Mood.journalContent
 *   - Mood.conversation
 *   - Trade.comment
 *
 * Prerequisites:
 *   - JOURNAL_ENCRYPTION_KEY (preferred) or ENCRYPTION_KEY
 *     Generate: openssl rand -hex 32
 *   - DATABASE_URL / DIRECT_URL pointing at the target DB
 *
 * Usage:
 *   bun run migrate:encrypt-journal-fields
 *   bun run migrate:encrypt-journal-fields -- --dry-run
 */
import '@/lib/load-env-local.node'
import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  encryptJournalConversation,
  encryptJournalField,
  hasJournalEncryptionKey,
  isEncryptedJournalField,
} from '@/lib/journal-field-crypto'

const dryRun = process.argv.includes('--dry-run')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
// Unextended client so we can see ciphertext vs plaintext on disk.
const prisma = new PrismaClient({ adapter })

function conversationNeedsEncrypt(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return !isEncryptedJournalField(value) && value !== ''
  return true
}

async function migrateMoods() {
  const rows = await prisma.mood.findMany({
    select: { id: true, journalContent: true, conversation: true },
  })

  let journalEncrypted = 0
  let conversationEncrypted = 0
  let skipped = 0

  for (const row of rows) {
    const next: {
      journalContent?: string | null
      conversation?: string
    } = {}

    if (row.journalContent && !isEncryptedJournalField(row.journalContent)) {
      next.journalContent = encryptJournalField(row.journalContent)
      journalEncrypted += 1
    }

    if (conversationNeedsEncrypt(row.conversation)) {
      next.conversation = encryptJournalConversation(row.conversation)
      conversationEncrypted += 1
    }

    if (Object.keys(next).length === 0) {
      skipped += 1
      continue
    }

    if (!dryRun) {
      await prisma.mood.update({
        where: { id: row.id },
        data: next,
      })
    }
  }

  return {
    total: rows.length,
    journalEncrypted,
    conversationEncrypted,
    skipped,
  }
}

async function migrateTradeComments() {
  const rows = await prisma.trade.findMany({
    where: { comment: { not: null } },
    select: { id: true, comment: true },
  })

  let migrated = 0
  let alreadyEncrypted = 0
  let skippedEmpty = 0

  for (const row of rows) {
    if (!row.comment) {
      skippedEmpty += 1
      continue
    }
    if (isEncryptedJournalField(row.comment)) {
      alreadyEncrypted += 1
      continue
    }

    const encrypted = encryptJournalField(row.comment)
    if (!encrypted) {
      skippedEmpty += 1
      continue
    }

    if (!dryRun) {
      await prisma.trade.update({
        where: { id: row.id },
        data: { comment: encrypted },
      })
    }
    migrated += 1
  }

  return {
    totalWithComment: rows.length,
    migrated,
    alreadyEncrypted,
    skippedEmpty,
  }
}

async function main() {
  if (!hasJournalEncryptionKey()) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY (or ENCRYPTION_KEY fallback) is missing or still a placeholder. Generate with: openssl rand -hex 32',
    )
  }

  console.log(
    `[migrate-encrypt-journal-fields] Starting${dryRun ? ' (dry-run)' : ''}…`,
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
    console.error('[migrate-encrypt-journal-fields] Failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
