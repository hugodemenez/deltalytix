import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { redirect } from "next/navigation"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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
