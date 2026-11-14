import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * True when the app still has a Subscription row for these user ids / emails
 * (used when Stripe is not configured so we fail closed instead of wiping).
 */
export async function hasLiveAppSubscription(input: {
  userIds: string[]
  emails: string[]
}): Promise<boolean> {
  const or: Array<
    | { userId: { in: string[] } }
    | { email: { equals: string; mode: 'insensitive' } }
  > = []
  if (input.userIds.length > 0) {
    or.push({ userId: { in: input.userIds } })
  }
  for (const email of input.emails) {
    const trimmed = email.trim()
    if (trimmed) {
      or.push({ email: { equals: trimmed, mode: 'insensitive' } })
    }
  }
  if (or.length === 0) return false

  const live = await prisma.subscription.findFirst({
    where: { OR: or },
    select: { id: true },
  })
  return Boolean(live)
}
