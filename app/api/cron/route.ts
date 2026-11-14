import { PrismaClient } from "@/prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Resend } from 'resend'
import { handlePrivateSchedule } from '@/lib/cron/handle-private-schedule'
import {
  buildWeeklyRecapEmail,
  type WeeklyRecapEmailData,
} from "@/lib/weekly-recap-email"
import {
  isResendIdempotentReplay,
  weeklyRecapIdempotencyKey,
} from "@/lib/weekly-recap-idempotency"
import {
  RESEND_RATE_LIMIT_RETRIES,
  RESEND_RATE_LIMIT_RETRY_MS,
  createResendRequestPacer,
  isResendRateLimitError,
} from "@/lib/resend-rate-limit"
import { getRecapWeekUtc } from "@/lib/weekly-newsletter-window"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })
const resend = new Resend(process.env.RESEND_API_KEY)

// Every subscriber's recap is now built in-process: DB read + one LLM call +
// email render each. The whole run must fit in a single invocation, so the
// default duration is not enough once the subscriber list grows.
export const maxDuration = 299

// Weekly performance recap. Schedule `weekly-recap`: `0 7 * * 0` UTC.
// Sunday 08:00 Lisbon. Summer WEST UTC+1 → 07:00 UTC.
// Winter WET UTC+0 → would need 08:00 UTC. Kept on UTC to match the old cron.
// Covers the Mon–Sun week ending that same Sunday — see `getRecapWeekUtc`.
async function runWeeklyRecap() {
  try {

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
      console.info('[schedule weekly-recap] no newsletter subscribers')
      return
    }

    // Build subscribers in chunks of 100 (LLM/DB concurrency), then send
    // one-by-one with a per-recipient idempotency key.
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

    // Identity of the recap being sent — anchors each per-recipient key.
    const week = getRecapWeekUtc()
    // Resend default is 10 req/s per team; each emails.send is one request.
    const paceResendSend = createResendRequestPacer()

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

        const validEmails = (await Promise.all(emailBatch)).filter(
          (email): email is WeeklyRecapEmailData => email != null,
        )
        // Users the green-week gate dropped are skips, not failures.
        skippedCount += batch.length - validEmails.length

        // One send per recipient. A set-level batch key changes when a new
        // subscriber appears, someone unsubscribes, or a retry recovers more
        // builds — and the original recipients get mailed twice. Per-email
        // keys 409 those people and still deliver recoveries and newcomers.
        for (const email of validEmails) {
          const recipient = email.to[0]
          if (!recipient) {
            errorCount += 1
            continue
          }

          try {
            let result: Awaited<ReturnType<typeof resend.emails.send>> | null =
              null

            for (
              let attempt = 0;
              attempt <= RESEND_RATE_LIMIT_RETRIES;
              attempt += 1
            ) {
              await paceResendSend()
              result = await resend.emails.send(email, {
                idempotencyKey: weeklyRecapIdempotencyKey(
                  week.start,
                  recipient,
                ),
              })

              if (!isResendRateLimitError(result.error)) {
                break
              }

              if (attempt === RESEND_RATE_LIMIT_RETRIES) {
                break
              }

              await new Promise((resolve) =>
                setTimeout(resolve, RESEND_RATE_LIMIT_RETRY_MS),
              )
            }

            if (result?.error) {
              // Recap copy is LLM-generated, so a retry has a different
              // payload under the same key: Resend 409s instead of sending
              // again. That person already got this week's mail.
              if (isResendIdempotentReplay(result.error)) {
                duplicateCount += 1
              } else {
                console.error(
                  `Failed to send weekly recap to ${recipient}:`,
                  result.error,
                )
                errorCount += 1
              }
            } else {
              successCount += 1
            }
          } catch (error) {
            console.error(`Failed to send weekly recap to ${recipient}:`, error)
            errorCount += 1
          }
        }
      } catch (error) {
        console.error('Error processing batch:', error)
        errorCount += batch.length
      }
    }

    const summary = `Weekly emails processed: ${successCount} successful, ${errorCount} failed, ${skippedCount} skipped (green-week gate), ${duplicateCount} already sent`
    console.log(summary)
  } catch (error) {
    console.error('Cron job error:', error)
    throw error
  }
}

export const POST = handlePrivateSchedule(async () => {
  await runWeeklyRecap()
})
