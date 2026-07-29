/**
 * Encrypt plaintext Connection.token values at rest (AES-256-GCM).
 *
 * Safe to re-run: already-encrypted tokens (enc:v1:…) are skipped.
 * Decrypt remains compatible with legacy plaintext until every row is migrated.
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY set (openssl rand -hex 32)
 *   - DATABASE_URL / DIRECT_URL pointing at the target DB
 *
 * Usage:
 *   bun run migrate:encrypt-connection-tokens
 *   bun run migrate:encrypt-connection-tokens -- --dry-run
 */
import '@/lib/load-env-local.node'
import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  encryptConnectionToken,
  hasConnectionTokenEncryptionKey,
  isEncryptedConnectionToken,
} from '@/lib/connection-token-crypto'

const dryRun = process.argv.includes('--dry-run')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  if (!hasConnectionTokenEncryptionKey()) {
    throw new Error(
      'ENCRYPTION_KEY is missing or still the .env.example placeholder. Generate with: openssl rand -hex 32',
    )
  }

  console.log(
    `[migrate-encrypt-connection-tokens] Starting${dryRun ? ' (dry-run)' : ''}…`,
  )

  const rows = await prisma.connection.findMany({
    where: { token: { not: null } },
    select: { id: true, service: true, externalId: true, token: true },
  })

  let alreadyEncrypted = 0
  let migrated = 0
  let skippedEmpty = 0

  for (const row of rows) {
    if (!row.token) {
      skippedEmpty += 1
      continue
    }
    if (isEncryptedConnectionToken(row.token)) {
      alreadyEncrypted += 1
      continue
    }

    const encrypted = encryptConnectionToken(row.token)
    if (!encrypted) {
      skippedEmpty += 1
      continue
    }

    if (!dryRun) {
      await prisma.connection.update({
        where: { id: row.id },
        data: { token: encrypted },
      })
    }

    migrated += 1
    console.log(
      `  ${dryRun ? 'would encrypt' : 'encrypted'} ${row.service}/${row.externalId} (${row.id})`,
    )
  }

  console.log('[migrate-encrypt-connection-tokens] Done', {
    totalWithToken: rows.length,
    migrated,
    alreadyEncrypted,
    skippedEmpty,
    dryRun,
  })
}

main()
  .catch((error) => {
    console.error('[migrate-encrypt-connection-tokens] Failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
