/**
 * Seeds a large number of demo accounts for the local dashboard user so widgets
 * can be exercised with realistic account counts (legend overflow, account
 * selection, per-account equity lines).
 *
 * Local databases only. Re-running replaces every account whose number starts
 * with the demo prefix; other accounts and trades are left untouched.
 *
 *   bun scripts/seed-many-accounts.ts
 *   SEED_ACCOUNT_COUNT=25 SEED_TRADE_DAYS=45 bun scripts/seed-many-accounts.ts
 */
import "dotenv/config"
import { loadEnvLocal } from "../lib/load-env-local.node"

loadEnvLocal()

import { randomUUID } from "crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

import { PrismaClient } from "../prisma/generated/prisma/client"

const LOCAL_USER_ID = process.env.LOCAL_DASHBOARD_USER_ID || "local-dashboard-user"
const LOCAL_USER_EMAIL =
  process.env.LOCAL_DASHBOARD_USER_EMAIL || "local-dashboard@deltalytix.local"
const ACCOUNT_PREFIX = process.env.SEED_ACCOUNT_PREFIX || "DEMO-"
const INSTRUMENTS = ["ESM6", "NQM6", "MESM6", "MNQM6", "YMM6", "RTYM6"]

function parsePositiveInt(name: string, fallback: number, max: number): number {
  const raw = process.env[name]
  if (!raw) return fallback

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}. Received: ${raw}`)
  }
  return parsed
}

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.")
  }

  const isLocal =
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes("@db:5432/") ||
    databaseUrl.includes("deltalytix_dev")

  if (!isLocal) {
    throw new Error(
      "Refusing to run: DATABASE_URL does not look like a local dev database. " +
        "This script deletes and recreates demo accounts.",
    )
  }

  return databaseUrl
}

/**
 * Deterministic pseudo-random in [0, 1) so re-runs produce the same data set.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

type SeedTrade = {
  id: string
  accountNumber: string
  accountId: string
  quantity: number
  instrument: string
  entryPrice: string
  closePrice: string
  entryDate: string
  closeDate: string
  pnl: number
  timeInPosition: number
  userId: string
  side: string
  commission: number
  tags: string[]
}

function buildTradesForAccount(
  userId: string,
  accountNumber: string,
  accountId: string,
  accountIndex: number,
  dayCount: number,
): SeedTrade[] {
  const random = seededRandom(accountIndex * 7919 + 13)
  // Give each account its own drift so the equity lines fan out instead of
  // stacking on top of each other.
  const drift = (random() - 0.45) * 40
  const volatility = 40 + random() * 160

  const now = new Date()
  const trades: SeedTrade[] = []

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const day = new Date(now)
    day.setDate(now.getDate() - (dayCount - dayIndex - 1))
    day.setHours(0, 0, 0, 0)

    // Not every account trades every day, so lines have gaps like real data.
    if (random() < 0.25) continue

    const tradesToday = 1 + Math.floor(random() * 3)
    for (let tradeIndex = 0; tradeIndex < tradesToday; tradeIndex++) {
      const instrument = INSTRUMENTS[Math.floor(random() * INSTRUMENTS.length)]
      const quantity = 1 + Math.floor(random() * 3)
      const side = random() < 0.5 ? "Long" : "Short"

      const entry = new Date(day)
      entry.setHours(9 + Math.floor(random() * 8), Math.floor(random() * 60), 0, 0)
      const holdMinutes = 5 + Math.floor(random() * 120)
      const close = new Date(entry.getTime() + holdMinutes * 60_000)

      const pnl = Number(((random() - 0.5) * volatility + drift).toFixed(2))
      const commission = Number((quantity * 2.1).toFixed(2))
      const entryPriceNumber = 5200 + random() * 120
      const closePriceNumber = entryPriceNumber + pnl / (quantity * 10)

      trades.push({
        id: randomUUID(),
        accountNumber,
        accountId,
        quantity,
        instrument,
        entryPrice: entryPriceNumber.toFixed(2),
        closePrice: closePriceNumber.toFixed(2),
        entryDate: entry.toISOString(),
        closeDate: close.toISOString(),
        pnl,
        timeInPosition: holdMinutes,
        userId,
        side,
        commission,
        tags: pnl >= 0 ? ["demo", "winner"] : ["demo", "loser"],
      })
    }
  }

  return trades
}

async function main() {
  const databaseUrl = requireLocalDatabaseUrl()
  const accountCount = parsePositiveInt("SEED_ACCOUNT_COUNT", 100, 500)
  const tradeDayCount = parsePositiveInt("SEED_TRADE_DAYS", 60, 365)

  const pool = new pg.Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const user = await prisma.user.upsert({
      where: { id: LOCAL_USER_ID },
      update: { email: LOCAL_USER_EMAIL, auth_user_id: LOCAL_USER_ID, isFirstConnection: false },
      create: {
        id: LOCAL_USER_ID,
        auth_user_id: LOCAL_USER_ID,
        email: LOCAL_USER_EMAIL,
        language: "en",
        isFirstConnection: false,
      },
    })

    const existing = await prisma.account.findMany({
      where: { userId: user.id, number: { startsWith: ACCOUNT_PREFIX } },
      select: { id: true },
    })

    if (existing.length > 0) {
      const existingIds = existing.map((account) => account.id)
      await prisma.trade.deleteMany({ where: { accountId: { in: existingIds } } })
      await prisma.payout.deleteMany({ where: { accountId: { in: existingIds } } })
      await prisma.account.deleteMany({ where: { id: { in: existingIds } } })
      console.log(`[seed-many-accounts] Removed ${existing.length} previous ${ACCOUNT_PREFIX}* accounts.`)
    }

    let totalTrades = 0

    for (let accountIndex = 0; accountIndex < accountCount; accountIndex++) {
      const number = `${ACCOUNT_PREFIX}${String(accountIndex + 1).padStart(3, "0")}`
      const account = await prisma.account.create({
        data: {
          id: randomUUID(),
          number,
          userId: user.id,
          propfirm: `Demo Firm ${(accountIndex % 5) + 1}`,
          startingBalance: 50_000,
          drawdownThreshold: 47_500,
          profitTarget: 53_500,
          isPerformance: true,
        },
      })

      const trades = buildTradesForAccount(
        user.id,
        number,
        account.id,
        accountIndex,
        tradeDayCount,
      )
      if (trades.length > 0) {
        await prisma.trade.createMany({ data: trades })
        totalTrades += trades.length
      }
    }

    console.log(
      `[seed-many-accounts] Created ${accountCount} accounts (${ACCOUNT_PREFIX}001…) with ${totalTrades} trades over ${tradeDayCount} days for ${LOCAL_USER_EMAIL}.`,
    )
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error("[seed-many-accounts] Failed:", error)
  process.exit(1)
})
