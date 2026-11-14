import 'server-only'

import { prisma } from '@/lib/prisma'

/** App DB statuses that mean the user is still being billed. */
export const LIVE_APP_SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'active',
  'TRIAL',
  'trialing',
  'PAST_DUE',
  'past_due',
] as const

function identityOrClause(input: {
  userIds: string[]
  emails: string[]
}): Array<
  | { userId: { in: string[] } }
  | { email: { equals: string; mode: 'insensitive' } }
> {
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
  return or
}

/**
 * True when the user still has a live personal, team, or business subscription
 * (active / trialing / past_due). Used when Stripe is not configured so we
 * fail closed instead of wiping.
 */
export async function hasLiveAppSubscription(input: {
  userIds: string[]
  emails: string[]
}): Promise<boolean> {
  const or = identityOrClause(input)
  if (or.length === 0) return false

  const where = {
    AND: [
      { OR: or },
      { status: { in: [...LIVE_APP_SUBSCRIPTION_STATUSES] } },
    ],
  }

  const [personal, team, business] = await Promise.all([
    prisma.subscription.findFirst({ where, select: { id: true } }),
    prisma.teamSubscription.findFirst({ where, select: { id: true } }),
    prisma.businessSubscription.findFirst({ where, select: { id: true } }),
  ])
  return Boolean(personal || team || business)
}
