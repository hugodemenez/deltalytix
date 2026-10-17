import "dotenv/config"
import { loadEnvLocal } from "../lib/load-env-local.node"

loadEnvLocal()

import { createHash, randomUUID } from "crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

import { PrismaClient } from "../prisma/generated/prisma/client"
import { API_SCOPES } from "../lib/api/scopes"

const SEED_OAUTH_CLIENT_ID = "dltx_app_seed_demo_connections"
const SEED_OAUTH_APP_NAME = "Seed Chart Companion"
const SEED_PAT_NAME = "Seed local scripts"

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

const LOCAL_USER_ID = process.env.LOCAL_DASHBOARD_USER_ID || "local-dashboard-user"
const LOCAL_USER_EMAIL =
  process.env.LOCAL_DASHBOARD_USER_EMAIL || "local-dashboard@deltalytix.local"
const LOCAL_ACCOUNT_NUMBER = process.env.LOCAL_DASHBOARD_ACCOUNT_NUMBER || "LOCAL-SIM-001"
const LOCAL_ACCOUNT_NAME = process.env.LOCAL_DASHBOARD_ACCOUNT_NAME || "Local Simulation"
function parseTradeDayCount(): number {
  const raw = process.env.LOCAL_DASHBOARD_TRADE_DAYS || "60"
  const parsed = Number.parseInt(raw, 10)

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
    throw new Error(
      `LOCAL_DASHBOARD_TRADE_DAYS must be an integer between 1 and 365. Received: ${raw}`,
    )
  }

  return parsed
}

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
  accountId?: string | null
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

function isLikelyLocalDatabase(databaseUrl: string): boolean {
  return (
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes("@db:5432/") ||
    databaseUrl.includes("deltalytix_dev")
  )
}

async function main() {
  const databaseUrl = requireDatabaseUrl()
  const tradeDayCount = parseTradeDayCount()

  if (!isLikelyLocalDatabase(databaseUrl)) {
    console.warn(
      "[seed-self-host] WARNING: DATABASE_URL does not look like a local dev database.",
    )
    console.warn(
      "[seed-self-host] This script deletes and recreates trades/payouts for the local demo account.",
    )
  }

  console.warn(
    "[seed-self-host] Destructive for demo data: trades and payouts for the local account will be replaced.",
  )

  const pool = new pg.Pool({ connectionString: databaseUrl })
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

    const trades = buildTrades(user.id, tradeDayCount).map((trade) => ({
      ...trade,
      accountId: account.id,
    }))
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

    // Demo OAuth authorization + PAT for settings → API connections UI.
    // Safe for local-only seed: fixed client id, replaced on every run.
    const existingSeedApp = await prisma.oAuthApp.findUnique({
      where: { clientId: SEED_OAUTH_CLIENT_ID },
      select: { id: true },
    })
    if (existingSeedApp) {
      await prisma.oAuthAccessToken.deleteMany({
        where: { appId: existingSeedApp.id },
      })
      await prisma.oAuthAuthorizationCode.deleteMany({
        where: { appId: existingSeedApp.id },
      })
      await prisma.oAuthApp.delete({ where: { id: existingSeedApp.id } })
    }
    await prisma.oAuthAccessToken.deleteMany({
      where: { userId: user.id, appId: null, name: SEED_PAT_NAME },
    })

    const seedApp = await prisma.oAuthApp.create({
      data: {
        userId: user.id,
        name: SEED_OAUTH_APP_NAME,
        description: "Local seed OAuth app for settings connections UI",
        logoUrl: "/logos/rithmic-logo-black.png",
        clientId: SEED_OAUTH_CLIENT_ID,
        clientSecretHash: sha256("dltx_secret_seed_demo_only"),
        redirectUris: ["http://localhost:3000/oauth/callback"],
        scopes: [...API_SCOPES],
      },
    })

    const authorizedAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const lastUsedAt = new Date(Date.now() - 2 * 60 * 60 * 1000)
    await prisma.oAuthAccessToken.create({
      data: {
        name: null,
        tokenHash: sha256(`seed-access-${user.id}`),
        refreshTokenHash: sha256(`seed-refresh-${user.id}`),
        appId: seedApp.id,
        userId: user.id,
        scopes: ["profile:read", "trades:read", "accounts:read"],
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastUsedAt,
        createdAt: authorizedAt,
      },
    })

    await prisma.oAuthAccessToken.create({
      data: {
        name: SEED_PAT_NAME,
        tokenHash: sha256(`seed-pat-${user.id}`),
        appId: null,
        userId: user.id,
        scopes: ["profile:read", "trades:read"],
        expiresAt: null,
        lastUsedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    })

    console.log(
      `[seed-self-host] Ready: user=${user.id}, account=${account.number}, trades=${trades.length}, days=${tradeDayCount}, oauthApp=${seedApp.clientId}`,
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

