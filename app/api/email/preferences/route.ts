import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeNewsletterEmail } from "@/lib/newsletter-email"
import { createClient } from "@/server/auth"

type NewsletterPreferences = {
  isActive: boolean
  weeklySummaryEnabled: boolean
  renewalNoticeEnabled: boolean
}

const preferenceBooleanFields = [
  "isActive",
  "weeklySummaryEnabled",
  "renewalNoticeEnabled",
] as const satisfies ReadonlyArray<keyof NewsletterPreferences>

function parsePreferencesPayload(
  body: unknown,
): ({ email: string } & NewsletterPreferences) | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" }
  }

  const record = body as Record<string, unknown>
  const email =
    typeof record.email === "string"
      ? normalizeNewsletterEmail(record.email)
      : ""

  if (!email) {
    return { error: "Email is required" }
  }

  const preferences = {} as NewsletterPreferences

  for (const field of preferenceBooleanFields) {
    if (typeof record[field] !== "boolean") {
      return { error: `Field '${field}' must be a boolean` }
    }
    preferences[field] = record[field]
  }

  return { email, ...preferences }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email
      ? normalizeNewsletterEmail(user.email)
      : undefined

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get("email")

    if (!emailParam) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      )
    }

    const email = normalizeNewsletterEmail(emailParam)

    if (email !== userEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const newsletter = await prisma.newsletter.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        email: true,
        isActive: true,
        weeklySummaryEnabled: true,
        renewalNoticeEnabled: true,
      },
    })

    return NextResponse.json({
      email,
      isActive: newsletter?.isActive ?? true,
      weeklySummaryEnabled: newsletter?.weeklySummaryEnabled ?? true,
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email
      ? normalizeNewsletterEmail(user.email)
      : undefined

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = parsePreferencesPayload(body)
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { email, ...dataToUpdate } = parsed

    if (email !== userEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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

    const updated = existing
      ? await prisma.newsletter.update({
          where: { email: existing.email },
          data: {
            email,
            ...dataToUpdate,
          },
          select: {
            email: true,
            isActive: true,
            weeklySummaryEnabled: true,
            renewalNoticeEnabled: true,
          },
        })
      : await prisma.newsletter.create({
          data: {
            email,
            ...dataToUpdate,
          },
          select: {
            email: true,
            isActive: true,
            weeklySummaryEnabled: true,
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
