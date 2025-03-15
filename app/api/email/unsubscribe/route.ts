import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { redirect } from "next/navigation"

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

    // Update or create newsletter record with isActive = false
    await prisma.newsletter.upsert({
      where: { email },
      update: { isActive: false },
      create: {
        email,
        isActive: false
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
