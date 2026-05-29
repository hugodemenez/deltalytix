import "dotenv/config"

import { randomUUID } from "crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

import { PrismaClient } from "../prisma/generated/prisma/client"

const LOCAL_USER_ID = process.env.LOCAL_DASHBOARD_USER_ID || "local-dashboard-user"
const LOCAL_USER_EMAIL =
  process.env.LOCAL_DASHBOARD_USER_EMAIL || "local-dashboard@deltalytix.local"
const LOCAL_ACCOUNT_NUMBER = process.env.LOCAL_DASHBOARD_ACCOUNT_NUMBER || "LOCAL-SIM-001"
const LOCAL_ACCOUNT_NAME = process.env.LOCAL_DASHBOARD_ACCOUNT_NAME || "Local Simulation"
const TRADE_DAY_COUNT = Number.parseInt(process.env.LOCAL_DASHBOARD_TRADE_DAYS || "60", 10)

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.")
  }
  return databaseUrl
}

type SeedTrade = {
  id: string
  accountNumber: string
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

function buildTrades(userId: string, dayCount: number): SeedTrade[] {
  const instruments = ["ESM6", "NQM6", "MESM6", "MNQM6"]
  const now = new Date()
  const trades: SeedTrade[] = []

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const day = new Date(now)
    day.setDate(now.getDate() - (dayCount - dayIndex - 1))
    day.setHours(0, 0, 0, 0)

    const tradesToday = dayIndex % 5 === 0 ? 3 : 2
    for (let tradeIndex = 0; tradeIndex < tradesToday; tradeIndex++) {
      const instrument = instruments[(dayIndex + tradeIndex) % instruments.length]
      const quantity = 1 + ((dayIndex + tradeIndex) % 3)
      const side = (dayIndex + tradeIndex) % 2 === 0 ? "Long" : "Short"

      const entry = new Date(day)
      entry.setHours(13 + ((dayIndex + tradeIndex) % 7), 3 + ((dayIndex * 11 + tradeIndex * 7) % 52), 0, 0)
      const holdMinutes = 10 + ((dayIndex * 9 + tradeIndex * 5) % 85)
      const close = new Date(entry.getTime() + holdMinutes * 60_000)

      const basePoints = ((dayIndex * 19 + tradeIndex * 13) % 180) - 70
      const pnl = Number((basePoints * quantity + (tradeIndex % 2 === 0 ? 35 : -15)).toFixed(2))
      const commission = Number((quantity * 2.1).toFixed(2))

      const entryPriceNumber = 5200 + ((dayIndex * 2 + tradeIndex) % 80) + (side === "Long" ? 0.25 : -0.25)
      const closePriceNumber = entryPriceNumber + pnl / (quantity * 10)

      trades.push({
        id: randomUUID(),
        accountNumber: LOCAL_ACCOUNT_NUMBER,
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
        tags: pnl >= 0 ? ["plan-followed", "momentum"] : ["pullback", "risk-control"],
      })
    }
  }

  return trades
}

async function upsertTickDetails(prisma: PrismaClient) {
  const tickers = [
    { ticker: "ES", tickValue: 12.5, tickSize: 0.25 },
    { ticker: "MES", tickValue: 1.25, tickSize: 0.25 },
    { ticker: "NQ", tickValue: 20, tickSize: 0.25 },
    { ticker: "MNQ", tickValue: 2, tickSize: 0.25 },
  ]

  for (const tickDetail of tickers) {
    const existing = await prisma.tickDetails.findFirst({
      where: { ticker: tickDetail.ticker },
      select: { id: true },
    })

    if (existing) {
      await prisma.tickDetails.update({
        where: { id: existing.id },
        data: tickDetail,
      })
      continue
    }

    await prisma.tickDetails.create({ data: tickDetail })
  }
}

async function main() {
  const pool = new pg.Pool({ connectionString: requireDatabaseUrl() })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const user = await prisma.user.upsert({
      where: { id: LOCAL_USER_ID },
      update: {
        email: LOCAL_USER_EMAIL,
        auth_user_id: LOCAL_USER_ID,
        isFirstConnection: false,
      },
      create: {
        id: LOCAL_USER_ID,
        auth_user_id: LOCAL_USER_ID,
        email: LOCAL_USER_EMAIL,
        language: "en",
        isFirstConnection: false,
      },
    })

    const account = await prisma.account.upsert({
      where: {
        number_userId: {
          number: LOCAL_ACCOUNT_NUMBER,
          userId: user.id,
        },
      },
      update: {
        propfirm: LOCAL_ACCOUNT_NAME,
        startingBalance: 50_000,
        drawdownThreshold: 47_500,
        profitTarget: 53_500,
        isPerformance: true,
      },
      create: {
        id: randomUUID(),
        number: LOCAL_ACCOUNT_NUMBER,
        userId: user.id,
        propfirm: LOCAL_ACCOUNT_NAME,
        startingBalance: 50_000,
        drawdownThreshold: 47_500,
        profitTarget: 53_500,
        isPerformance: true,
      },
    })

    await upsertTickDetails(prisma)

    await prisma.trade.deleteMany({
      where: {
        userId: user.id,
        accountNumber: LOCAL_ACCOUNT_NUMBER,
      },
    })

    const trades = buildTrades(user.id, TRADE_DAY_COUNT)
    await prisma.trade.createMany({ data: trades })

    await prisma.payout.deleteMany({ where: { accountId: account.id } })
    await prisma.payout.createMany({
      data: [
        {
          id: randomUUID(),
          accountId: account.id,
          accountNumber: account.number,
          amount: 850,
          date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          status: "PAID",
        },
        {
          id: randomUUID(),
          accountId: account.id,
          accountNumber: account.number,
          amount: 1200,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: "PAID",
        },
      ],
    })

    console.log(
      `[seed-self-host] Ready: user=${user.id}, account=${account.number}, trades=${trades.length}, days=${TRADE_DAY_COUNT}`,
    )
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error("[seed-self-host] Failed:", error)
  process.exit(1)
})

