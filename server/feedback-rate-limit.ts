import 'server-only'

import { prisma } from '@/lib/prisma'

export const FEEDBACK_RATE_LIMIT = 3
const FEEDBACK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

interface FeedbackRateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

/**
 * Atomically consumes one slot in the authenticated user's hourly feedback
 * allowance. A database-backed counter is required because Vercel instances do
 * not share in-memory state.
 */
export async function consumeFeedbackRateLimit(
  userId: string,
  now = new Date(),
): Promise<FeedbackRateLimitResult> {
  const windowStart = new Date(now)
  windowStart.setUTCMinutes(0, 0, 0)

  const usage = await prisma.feedbackRateLimit.upsert({
    where: {
      userId_windowStart: {
        userId,
        windowStart,
      },
    },
    create: {
      userId,
      windowStart,
    },
    update: {
      count: { increment: 1 },
    },
    select: {
      count: true,
    },
  })

  return {
    allowed: usage.count <= FEEDBACK_RATE_LIMIT,
    limit: FEEDBACK_RATE_LIMIT,
    remaining: Math.max(0, FEEDBACK_RATE_LIMIT - usage.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(
        (windowStart.getTime() + FEEDBACK_RATE_LIMIT_WINDOW_MS - now.getTime()) /
          1000,
      ),
    ),
  }
}
