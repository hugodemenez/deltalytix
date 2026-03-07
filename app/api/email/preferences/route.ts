import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

type NewsletterPreferencesPayload = {
  email?: string
  isActive?: boolean
  weeklySummaryEnabled?: boolean
  monthlyStatsEnabled?: boolean
  renewalNoticeEnabled?: boolean
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      )
    }

    const newsletter = await prisma.newsletter.findUnique({
      where: { email },
      select: {
        email: true,
        isActive: true,
        weeklySummaryEnabled: true,
        monthlyStatsEnabled: true,
        renewalNoticeEnabled: true,
      },
    })

    return NextResponse.json({
      email,
      isActive: newsletter?.isActive ?? true,
      weeklySummaryEnabled: newsletter?.weeklySummaryEnabled ?? true,
      monthlyStatsEnabled: newsletter?.monthlyStatsEnabled ?? true,
      renewalNoticeEnabled: newsletter?.renewalNoticeEnabled ?? true,
    })
  } catch (error) {
    console.error("Newsletter preferences GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewsletterPreferencesPayload
    const email = body.email?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const dataToUpdate = {
      isActive: body.isActive ?? true,
      weeklySummaryEnabled: body.weeklySummaryEnabled ?? true,
      monthlyStatsEnabled: body.monthlyStatsEnabled ?? true,
      renewalNoticeEnabled: body.renewalNoticeEnabled ?? true,
    }

    const updated = await prisma.newsletter.upsert({
      where: { email },
      update: dataToUpdate,
      create: {
        email,
        ...dataToUpdate,
      },
      select: {
        email: true,
        isActive: true,
        weeklySummaryEnabled: true,
        monthlyStatsEnabled: true,
        renewalNoticeEnabled: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Newsletter preferences POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
