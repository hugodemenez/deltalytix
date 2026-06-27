import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  defaultNewsletterPreferences,
  normalizeNewsletterEmail,
  newsletterPreferenceBooleanFields,
  type NewsletterPreferenceFields,
  verifyNewsletterPreferencesToken,
} from "@/lib/newsletter-email"
import { createClient } from "@/server/auth"

export const dynamic = "force-dynamic"

type ResolvedEmail =
  | { email: string; mode: "session" | "token" }
  | { error: string; status: number }

function parsePreferencesPayload(
  body: unknown,
): NewsletterPreferenceFields | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" }
  }

  const record = body as Record<string, unknown>
  const preferences = {} as NewsletterPreferenceFields

  for (const field of newsletterPreferenceBooleanFields) {
    if (typeof record[field] !== "boolean") {
      return { error: `Field '${field}' must be a boolean` }
    }
    preferences[field] = record[field]
  }

  return preferences
}

async function resolveAuthorizedEmail(
  request: Request,
  options?: { email?: string | null; token?: string | null },
): Promise<ResolvedEmail> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const sessionEmail = user?.email
    ? normalizeNewsletterEmail(user.email)
    : undefined

  const token = options?.token?.trim()
  if (token) {
    const tokenEmail = verifyNewsletterPreferencesToken(token)
    if (!tokenEmail) {
      return { error: "Invalid or expired token", status: 401 }
    }

    const requestedEmail = options?.email
      ? normalizeNewsletterEmail(options.email)
      : tokenEmail

    if (requestedEmail !== tokenEmail) {
      return { error: "Forbidden", status: 403 }
    }

    return { email: tokenEmail, mode: "token" }
  }

  if (!sessionEmail) {
    return { error: "Unauthorized", status: 401 }
  }

  const requestedEmail = options?.email
    ? normalizeNewsletterEmail(options.email)
    : sessionEmail

  if (requestedEmail !== sessionEmail) {
    return { error: "Forbidden", status: 403 }
  }

  return { email: sessionEmail, mode: "session" }
}

async function findNewsletterPreferences(email: string) {
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
      monthlyStatsEnabled: true,
      renewalNoticeEnabled: true,
    },
  })

  return {
    email,
    isActive: newsletter?.isActive ?? defaultNewsletterPreferences.isActive,
    weeklySummaryEnabled:
      newsletter?.weeklySummaryEnabled ??
      defaultNewsletterPreferences.weeklySummaryEnabled,
    monthlyStatsEnabled:
      newsletter?.monthlyStatsEnabled ??
      defaultNewsletterPreferences.monthlyStatsEnabled,
    renewalNoticeEnabled:
      newsletter?.renewalNoticeEnabled ??
      defaultNewsletterPreferences.renewalNoticeEnabled,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const resolved = await resolveAuthorizedEmail(request, {
      email: searchParams.get("email"),
      token: searchParams.get("token"),
    })

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      )
    }

    return NextResponse.json(await findNewsletterPreferences(resolved.email))
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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
    const resolved = await resolveAuthorizedEmail(request, {
      email: typeof record.email === "string" ? record.email : null,
      token: typeof record.token === "string" ? record.token : null,
    })

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      )
    }

    const parsed = parsePreferencesPayload(body)
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const existing = await prisma.newsletter.findFirst({
      where: {
        email: {
          equals: resolved.email,
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
            email: resolved.email,
            ...parsed,
          },
          select: {
            email: true,
            isActive: true,
            weeklySummaryEnabled: true,
            monthlyStatsEnabled: true,
            renewalNoticeEnabled: true,
          },
        })
      : await prisma.newsletter.create({
          data: {
            email: resolved.email,
            ...parsed,
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
