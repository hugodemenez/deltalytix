import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

// Add route segment config
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Get the newsletter preferences
    const newsletter = await prisma.newsletter.findUnique({
      where: { email },
      select: {
        email: true,
        isActive: true,
        monthlyStats: true,
        weeklyUpdates: true,
        renewalNotifications: true,
      }
    })

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Email not found in newsletter list' },
        { status: 404 }
      )
    }

    return NextResponse.json(newsletter)
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, monthlyStats, weeklyUpdates, renewalNotifications } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Update or create newsletter preferences
    const newsletter = await prisma.newsletter.upsert({
      where: { email },
      update: {
        monthlyStats: monthlyStats ?? true,
        weeklyUpdates: weeklyUpdates ?? true,
        renewalNotifications: renewalNotifications ?? true,
      },
      create: {
        email,
        isActive: true,
        monthlyStats: monthlyStats ?? true,
        weeklyUpdates: weeklyUpdates ?? true,
        renewalNotifications: renewalNotifications ?? true,
      }
    })

    return NextResponse.json({
      success: true,
      preferences: {
        email: newsletter.email,
        monthlyStats: newsletter.monthlyStats,
        weeklyUpdates: newsletter.weeklyUpdates,
        renewalNotifications: newsletter.renewalNotifications,
      }
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
