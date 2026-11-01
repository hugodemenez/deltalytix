import { loadEnvLocal } from "@/lib/load-env-local.node"
import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { withJournalFieldEncryption } from '@/lib/prisma-journal-encryption'

loadEnvLocal()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma =
  globalForPrisma.prisma ??
  withJournalFieldEncryption(new PrismaClient({ adapter }))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 