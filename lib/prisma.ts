import { loadEnvLocal } from "@/lib/load-env-local.node"
import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { withJournalFieldEncryption } from '@/lib/prisma-journal-encryption'

loadEnvLocal()

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

/** Unextended client: raw ciphertext for backfill, Protocol rebuild, and overwrite checks. */
export const prismaBase =
  globalForPrisma.prismaBase ?? new PrismaClient({ adapter })

export const prisma =
  globalForPrisma.prisma ?? withJournalFieldEncryption(prismaBase)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBase = prismaBase
  globalForPrisma.prisma = prisma
}
