import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Resend } from 'resend'
import { headers } from 'next/headers'
import {
  buildWeeklyRecapEmail,
  type WeeklyRecapEmailData,
} from "@/lib/weekly-recap-email"
import { weeklyRecapBatchIdempotencyKey } from "@/lib/weekly-recap-idempotency"
import { getRecapWeekUtc } from "@/lib/weekly-newsletter-window"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })
const resend = new Resend(process.env.RESEND_API_KEY)

// Every subscriber's recap is now built in-process: DB read + one LLM call +
// email render each. The whole run must fit in a single invocation, so the
// default duration is not enough once the subscriber list grows.
export const maxDuration = 300

// Weekly performance recap. Vercel cron: path `/api/cron`, schedule `0 7 * * 0`.
// Sunday 08:00 Lisbon. Summer WEST UTC+1 → 07:00 UTC (`0 7 * * 0`).
// Winter WET UTC+0 → would need 08:00 UTC. Vercel cron objects only allow path + schedule.
// Covers the Mon–Sun week ending that same Sunday — see `getRecapWeekUtc`.
export async function GET(req: Request) {
  try {
    // Verify that this is a legitimate Vercel cron job request
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all users with newsletter enabled
    const usersWithNewsletter = await prisma.newsletter.findMany({
      where: {
        isActive: {
          equals: true
        }
      }
    })

    // Get all users id with newsletter enabled
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: usersWithNewsletter.map(newsletter => newsletter.email)
        }
      }
    })

    if (users.length === 0) {
      return NextResponse.json(
        { message: 'No users found' },
        { status: 200 }
      )
    }

    // Process subscribers in batches of 100 (Resend's batch limit)
    const batchSize = 100
    const batches: typeof users[] = []
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      batches.push(batch)
    }

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    let duplicateCount = 0

    // Identity of the recap being sent — anchors the per-batch idempotency key.
    const week = getRecapWeekUtc()

    // Process each batch
    for (const batch of batches) {
      try {
        const emailBatch = batch.map(async (user) => {
          if (!user.email) {
            console.warn(`No email found for user: ${user.id}`)
            return null
          }

          try {
            // In-process builder: avoid HTTP self-fetch via NEXT_PUBLIC_APP_URL.
            // Apex deltalytix.app 308s to www (cross-origin); fetch then strips
            // Authorization, so weekly-summary returned {"error":"Unauthorized"}.
            // Same User.id the cron just loaded (email unique). Builder
            // re-loads by that id and checks the email still matches.
            const { emailData } = await buildWeeklyRecapEmail(
              user.id,
              user.email,
            )
            return emailData
          } catch (error) {
            console.warn(`Error processing user ${user.id}:`, error)
            return null
          }
        })

        // Filter out null values and send batch
        const validEmails = (await Promise.all(emailBatch)).filter(
          (email): email is WeeklyRecapEmailData => email != null,
        )
        // Users the green-week gate dropped are skips, not failures.
        skippedCount += batch.length - validEmails.length

        if (validEmails.length > 0) {
          try {
            const result = await resend.batch.send(validEmails, {
              idempotencyKey: weeklyRecapBatchIdempotencyKey(week.start, validEmails),
            })

            if (result.error) {
              // The recap copy is LLM-generated, so a retry sends a different
              // payload under the same key: Resend answers 409 rather than
              // deduping silently. Nobody got a second email — not an outage.
              if (
                result.error.name === 'invalid_idempotent_request' ||
                result.error.name === 'concurrent_idempotent_requests'
              ) {
                console.log(
                  `Batch already sent for week ${week.start.toISOString().slice(0, 10)}, skipping ${validEmails.length} recipients:`,
                  result.error.message,
                )
                duplicateCount += validEmails.length
              } else {
                console.error('Failed to send email batch:', result.error)
                errorCount += validEmails.length
              }
            } else {
              const sent = result.data?.data.length ?? 0
              successCount += sent
              errorCount += validEmails.length - sent
            }
          } catch (error) {
            console.error('Failed to send email batch:', error)
            errorCount += validEmails.length
          }
        }
      } catch (error) {
        console.error('Error processing batch:', error)
        errorCount += batch.length
      }
    }

    const summary = `Weekly emails processed: ${successCount} successful, ${errorCount} failed, ${skippedCount} skipped (green-week gate), ${duplicateCount} already sent`
    console.log(summary)

    return NextResponse.json({
      success: true,
      message: summary,
      stats: {
        success: successCount,
        failed: errorCount,
        skipped: skippedCount,
        duplicate: duplicateCount,
      }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
