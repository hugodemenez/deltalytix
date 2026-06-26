/**
 * Verifies calendar day bucketing matches trade table entry-date display
 * for trades stored as UTC timestamps near midnight boundaries.
 *
 * Usage:
 *   bun scripts/verify-calendar-timezone.ts           # logic-only checks
 *   bun scripts/verify-calendar-timezone.ts --seed    # insert trades into local DB and re-check
 */
import "dotenv/config"
import { randomUUID } from "crypto"
import { formatInTimeZone } from "date-fns-tz"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

import { loadEnvLocal } from "../lib/load-env-local.node"
import { formatCalendarData } from "../lib/utils"
import type { Trade } from "../prisma/generated/prisma/browser"
import { PrismaClient } from "../prisma/generated/prisma/client"

loadEnvLocal()

const LOCAL_USER_ID = process.env.LOCAL_DASHBOARD_USER_ID || "local-dashboard-user"
const LOCAL_ACCOUNT_NUMBER =
  process.env.LOCAL_DASHBOARD_ACCOUNT_NUMBER || "LOCAL-SIM-001"

const TIMEZONES = [
  "UTC",
  "Europe/Paris",
  "America/New_York",
  "Asia/Dubai",
  "Australia/Sydney",
] as const

/** UTC timestamps that straddle calendar days in common trading timezones. */
const EDGE_CASE_TRADES = [
  {
    label: "user-report (Paris late evening -> next local day)",
    entryDate: "2026-06-21T22:00:00.000Z",
  },
  {
    label: "US evening futures (NY still same UTC day)",
    entryDate: "2026-06-22T03:30:00.000Z",
  },
  {
    label: "Sydney morning (previous UTC day)",
    entryDate: "2026-06-21T14:00:00.000Z",
  },
  {
    label: "exact UTC midnight",
    entryDate: "2026-06-22T00:00:00.000Z",
  },
  {
    label: "one second before UTC midnight",
    entryDate: "2026-06-21T23:59:59.000Z",
  },
] as const

function tableEntryDate(trade: Trade, timezone: string): string {
  return formatInTimeZone(new Date(trade.entryDate), timezone, "yyyy-MM-dd")
}

function utcCalendarDay(trade: Trade): string {
  return formatInTimeZone(new Date(trade.entryDate), "UTC", "yyyy-MM-dd")
}

function calendarDayForTrade(
  trade: Trade,
  timezone: string,
  calendarData: ReturnType<typeof formatCalendarData>,
): string | null {
  for (const [day, entry] of Object.entries(calendarData)) {
    if (entry.trades.some((t) => t.entryDate === trade.entryDate)) {
      return day
    }
  }
  return null
}

function makeTrade(entryDate: string, instrument: string): Trade {
  return {
    id: randomUUID(),
    entryDate,
    closeDate: entryDate,
    pnl: 100,
    commission: 0,
    side: "long",
    accountNumber: LOCAL_ACCOUNT_NUMBER,
    instrument,
    quantity: 1,
    userId: LOCAL_USER_ID,
  } as Trade
}

function runLogicChecks(trades: Trade[]) {
  console.log("\n=== Calendar vs table date alignment ===\n")

  let mismatches = 0
  let utcWouldMismatch = 0

  for (const timezone of TIMEZONES) {
    console.log(`Timezone: ${timezone}`)
    const calendarData = formatCalendarData(trades, [], timezone)

    for (const spec of EDGE_CASE_TRADES) {
      const trade = trades.find((t) => t.entryDate === spec.entryDate)
      if (!trade) continue

      const tableDate = tableEntryDate(trade, timezone)
      const calendarDate = calendarDayForTrade(trade, timezone, calendarData)
      const oldUtcDay = utcCalendarDay(trade)
      const ok = tableDate === calendarDate

      if (!ok) mismatches++
      if (oldUtcDay !== tableDate) utcWouldMismatch++

      console.log(
        `  ${ok ? "OK" : "MISMATCH"} | ${spec.label}`,
      )
      console.log(
        `         stored: ${spec.entryDate}`,
      )
      console.log(
        `         table: ${tableDate} | calendar: ${calendarDate ?? "—"} | old UTC bucket: ${oldUtcDay}`,
      )
    }
    console.log("")
  }

  console.log("Summary:")
  console.log(`  Mismatches (fixed calendar vs table): ${mismatches}`)
  console.log(`  Cases where old UTC bucketing != table date: ${utcWouldMismatch}`)

  if (mismatches > 0) {
    process.exitCode = 1
  }
}

async function seedEdgeCaseTrades(prisma: PrismaClient) {
  const marker = "tz-edge-verify"

  await prisma.trade.deleteMany({
    where: {
      userId: LOCAL_USER_ID,
      tags: { has: marker },
    },
  })

  const created: Trade[] = []

  for (const spec of EDGE_CASE_TRADES) {
    const trade = makeTrade(spec.entryDate, `MNQ-${marker}`)
    await prisma.trade.create({
      data: {
        id: trade.id,
        userId: LOCAL_USER_ID,
        accountNumber: LOCAL_ACCOUNT_NUMBER,
        instrument: trade.instrument,
        quantity: 1,
        entryPrice: "30400",
        closePrice: "30450",
        entryDate: trade.entryDate,
        closeDate: trade.closeDate,
        pnl: 50,
        commission: 2,
        side: "Long",
        timeInPosition: 300,
        tags: [marker, spec.label],
      },
    })
    created.push(trade)
  }

  console.log(`\nSeeded ${created.length} timezone edge-case trades (tag: ${marker})`)
  return created
}

async function loadSeededTrades(prisma: PrismaClient): Promise<Trade[]> {
  const rows = await prisma.trade.findMany({
    where: {
      userId: LOCAL_USER_ID,
      tags: { has: "tz-edge-verify" },
    },
    orderBy: { entryDate: "asc" },
  })
  return rows as Trade[]
}

async function main() {
  const shouldSeed = process.argv.includes("--seed")
  const inMemoryTrades = EDGE_CASE_TRADES.map((spec, index) =>
    makeTrade(spec.entryDate, `MNQ-${index}`),
  )

  runLogicChecks(inMemoryTrades)

  if (!shouldSeed) {
    console.log("\nRun with --seed to insert edge-case trades into local Postgres and re-verify from DB.")
    return
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for --seed")
  }

  const pool = new pg.Pool({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    await seedEdgeCaseTrades(prisma)
    const dbTrades = await loadSeededTrades(prisma)
    console.log(`\nLoaded ${dbTrades.length} trades from database`)
    runLogicChecks(dbTrades)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
