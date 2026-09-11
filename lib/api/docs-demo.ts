import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import {
  accessTokenExpiresAt,
  generateAccessToken,
  sha256,
} from "@/lib/api/tokens"

export const DOCS_DEMO_USER_ID = "docs-demo-user"
export const DOCS_DEMO_USER_EMAIL = "docs-demo@deltalytix.app"
export const DOCS_DEMO_ACCOUNT_NUMBER = "DEMO-001"
export const DOCS_DEMO_TOKEN_NAME = "Docs demo"

export const DOCS_DEMO_SCOPES = [
  "profile:read",
  "trades:read",
  "accounts:read",
  "connections:read",
  "metrics:read",
] as const

const CACHE_REFRESH_MS = 5 * 60 * 1000

type CachedDemoToken = {
  token: string
  id: string
  expiresAt: number
}

let cachedDemoToken: CachedDemoToken | null = null

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

function sampleTrades(userId: string, accountId: string) {
  const rows: Array<{
    instrument: string
    side: string
    quantity: number
    entryPrice: number
    closePrice: number
    pnl: number
    hoursAgoEntry: number
    holdMinutes: number
    tags: string[]
  }> = [
    {
      instrument: "ESM6",
      side: "Long",
      quantity: 2,
      entryPrice: 5284.25,
      closePrice: 5291.5,
      pnl: 725,
      hoursAgoEntry: 6,
      holdMinutes: 42,
      tags: ["plan-followed", "momentum"],
    },
    {
      instrument: "NQM6",
      side: "Short",
      quantity: 1,
      entryPrice: 19120,
      closePrice: 19086.5,
      pnl: 670,
      hoursAgoEntry: 8,
      holdMinutes: 28,
      tags: ["plan-followed"],
    },
    {
      instrument: "MESM6",
      side: "Long",
      quantity: 4,
      entryPrice: 5281,
      closePrice: 5276.75,
      pnl: -170,
      hoursAgoEntry: 26,
      holdMinutes: 18,
      tags: ["pullback"],
    },
    {
      instrument: "MNQM6",
      side: "Long",
      quantity: 3,
      entryPrice: 19105.25,
      closePrice: 19122,
      pnl: 100.5,
      hoursAgoEntry: 30,
      holdMinutes: 55,
      tags: ["momentum"],
    },
    {
      instrument: "ESM6",
      side: "Short",
      quantity: 1,
      entryPrice: 5272.5,
      closePrice: 5264,
      pnl: 425,
      hoursAgoEntry: 50,
      holdMinutes: 33,
      tags: ["plan-followed", "risk-control"],
    },
    {
      instrument: "NQM6",
      side: "Long",
      quantity: 2,
      entryPrice: 19040,
      closePrice: 19012,
      pnl: -560,
      hoursAgoEntry: 54,
      holdMinutes: 21,
      tags: ["pullback"],
    },
  ]

  return rows.map((row) => {
    const entry = hoursAgo(row.hoursAgoEntry)
    const close = new Date(entry.getTime() + row.holdMinutes * 60_000)
    return {
      id: randomUUID(),
      accountNumber: DOCS_DEMO_ACCOUNT_NUMBER,
      accountId,
      quantity: row.quantity,
      instrument: row.instrument,
      entryPrice: row.entryPrice.toFixed(2),
      closePrice: row.closePrice.toFixed(2),
      entryDate: entry.toISOString(),
      closeDate: close.toISOString(),
      pnl: row.pnl,
      timeInPosition: row.holdMinutes,
      userId,
      side: row.side,
      commission: Number((row.quantity * 2.1).toFixed(2)),
      tags: row.tags,
    }
  })
}

async function ensureDocsDemoUser() {
  try {
    return await prisma.user.upsert({
      where: { id: DOCS_DEMO_USER_ID },
      update: {
        email: DOCS_DEMO_USER_EMAIL,
        auth_user_id: DOCS_DEMO_USER_ID,
        isFirstConnection: false,
      },
      create: {
        id: DOCS_DEMO_USER_ID,
        auth_user_id: DOCS_DEMO_USER_ID,
        email: DOCS_DEMO_USER_EMAIL,
        language: "en",
        isFirstConnection: false,
      },
    })
  } catch (error) {
    const existing = await prisma.user.findUnique({
      where: { email: DOCS_DEMO_USER_EMAIL },
    })
    if (existing) return existing
    throw error
  }
}

async function ensureDocsDemoDataset() {
  const user = await ensureDocsDemoUser()

  const account = await prisma.account.upsert({
    where: {
      number_userId: {
        number: DOCS_DEMO_ACCOUNT_NUMBER,
        userId: user.id,
      },
    },
    update: {
      propfirm: "Docs demo",
      startingBalance: 50_000,
      drawdownThreshold: 47_500,
      profitTarget: 53_500,
      isPerformance: true,
    },
    create: {
      id: randomUUID(),
      number: DOCS_DEMO_ACCOUNT_NUMBER,
      userId: user.id,
      propfirm: "Docs demo",
      startingBalance: 50_000,
      drawdownThreshold: 47_500,
      profitTarget: 53_500,
      isPerformance: true,
    },
  })

  const tradeCount = await prisma.trade.count({
    where: { userId: user.id, accountNumber: DOCS_DEMO_ACCOUNT_NUMBER },
  })
  if (tradeCount === 0) {
    await prisma.trade.createMany({
      data: sampleTrades(user.id, account.id),
    })
  }

  return user
}

export async function issueDocsDemoToken(): Promise<{
  token: string
  id: string
}> {
  const now = Date.now()
  if (
    cachedDemoToken &&
    cachedDemoToken.expiresAt - now > CACHE_REFRESH_MS
  ) {
    return { token: cachedDemoToken.token, id: cachedDemoToken.id }
  }

  const user = await ensureDocsDemoDataset()

  await prisma.oAuthAccessToken.deleteMany({
    where: {
      userId: user.id,
      name: DOCS_DEMO_TOKEN_NAME,
      expiresAt: { lte: new Date() },
    },
  })

  const token = generateAccessToken()
  const expiresAt = accessTokenExpiresAt()
  const record = await prisma.oAuthAccessToken.create({
    data: {
      name: DOCS_DEMO_TOKEN_NAME,
      tokenHash: sha256(token),
      userId: user.id,
      scopes: [...DOCS_DEMO_SCOPES],
      appId: null,
      expiresAt,
    },
  })

  cachedDemoToken = {
    token,
    id: record.id,
    expiresAt: expiresAt.getTime(),
  }

  return { token, id: record.id }
}
