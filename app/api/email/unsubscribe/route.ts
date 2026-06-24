import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizeNewsletterEmail,
  verifyNewsletterUnsubscribeToken,
} from "@/lib/newsletter-email"
import { createClient } from "@/server/auth"

async function resolveAuthorizedEmail(request: Request): Promise<
  | { email: string }
  | { error: string; status: number }
> {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (token) {
    const email = verifyNewsletterUnsubscribeToken(token)
    return email
      ? { email }
      : { error: "Invalid unsubscribe token", status: 400 }
  }

  const emailParam = searchParams.get("email")

  if (!emailParam) {
    return { error: "Email parameter or unsubscribe token is required", status: 400 }
  }

  const email = normalizeNewsletterEmail(emailParam)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email ? normalizeNewsletterEmail(user.email) : undefined

  if (!userEmail) {
    return { error: "Unauthorized", status: 401 }
  }

  if (email !== userEmail) {
    return { error: "Forbidden", status: 403 }
  }

  return { email }
}

async function unsubscribeEmail(email: string) {
  const existing = await prisma.newsletter.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      email: true,
    },
  })

  const data = {
    email,
    isActive: false,
    weeklySummaryEnabled: false,
  }

  if (existing) {
    await prisma.newsletter.update({
      where: { email: existing.email },
      data,
    })
    return
  }

  await prisma.newsletter.create({
    data,
  })
}

export async function GET(request: Request) {
  try {
    const resolved = await resolveAuthorizedEmail(request)

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      )
    }

    await unsubscribeEmail(resolved.email)

    // Redirect to the newsletter preferences page
    return NextResponse.redirect(
      new URL(`/newsletter?status=unsubscribed&email=${encodeURIComponent(resolved.email)}`, request.url)
    )
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const resolved = await resolveAuthorizedEmail(request)

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      )
    }

    await unsubscribeEmail(resolved.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
