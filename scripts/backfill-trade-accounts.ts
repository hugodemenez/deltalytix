/**
 * One-off / seed helper: backfill Trade.accountId and create missing Account rows
 * for orphan trade accountNumbers. Leaves Account.connectionId null.
 *
 * Run: bun scripts/backfill-trade-accounts.ts
 */
import '@/lib/load-env-local.node'
import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('[backfill] Starting Trade.accountId / Account backfill…')

  const orphanGroups = await prisma.trade.groupBy({
    by: ['userId', 'accountNumber'],
    where: {
      OR: [{ accountId: null }, { accountId: { equals: null } }],
    },
    _count: { _all: true },
  })

  // Also include trades that may already have numbers without Account rows
  const allPairs = await prisma.trade.groupBy({
    by: ['userId', 'accountNumber'],
    _count: { _all: true },
  })

  console.log(`[backfill] Found ${allPairs.length} user/accountNumber pairs`)

  let accountsCreated = 0
  let tradesLinked = 0

  for (const pair of allPairs) {
    if (!pair.accountNumber) continue

    const account = await prisma.account.upsert({
      where: {
        number_userId: {
          number: pair.accountNumber,
          userId: pair.userId,
        },
      },
      update: {},
      create: {
        number: pair.accountNumber,
        userId: pair.userId,
      },
      select: { id: true },
    })

    // Count whether this was effectively a create by checking createdAt isn't needed;
    // we just upsert and link.
    accountsCreated++

    const updated = await prisma.trade.updateMany({
      where: {
        userId: pair.userId,
        accountNumber: pair.accountNumber,
        accountId: null,
      },
      data: {
        accountId: account.id,
      },
    })
    tradesLinked += updated.count
  }

  console.log(
    `[backfill] Done. Upserted ~${accountsCreated} accounts, linked ${tradesLinked} trades. Orphan groups seen: ${orphanGroups.length}`
  )
}

main()
  .catch((err) => {
    console.error('[backfill] Failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
