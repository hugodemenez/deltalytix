import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeNewsletterEmail } from "@/lib/newsletter-email"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")

    if (!emailParam) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const email = normalizeNewsletterEmail(emailParam)

    // Update or create newsletter record with isActive = false
    await prisma.newsletter.upsert({
      where: { email },
      update: {
        isActive: false,
        weeklySummaryEnabled: false,
        monthlyStatsEnabled: false,
        renewalNoticeEnabled: false,
      },
      create: {
        email,
        isActive: false,
        weeklySummaryEnabled: false,
        monthlyStatsEnabled: false,
        renewalNoticeEnabled: false,
      }
    })

    // Redirect to the newsletter preferences page
    return NextResponse.redirect(
      new URL(`/newsletter?status=unsubscribed&email=${encodeURIComponent(email)}`, request.url)
    )
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
