import 'server-only'

import { prisma } from '@/lib/prisma'

/** Terminal statuses that are no longer billed (case-insensitive). */
export const TERMINAL_APP_SUBSCRIPTION_STATUSES = [
  'cancelled',
  'canceled',
  'expired',
  'incomplete_expired',
] as const

export function isTerminalSubscriptionStatus(status: string): boolean {
  return (TERMINAL_APP_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    status.trim().toLowerCase(),
  )
}

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
 * True when the user still has a live personal, team, or business subscription.
 * Deny-list: only cancelled/canceled, expired, and incomplete_expired are
 * terminal; everything else (including SCHEDULED_CANCELLATION and unknowns)
 * counts as live so keyless delete fails closed.
 */
export async function hasLiveAppSubscription(input: {
  userIds: string[]
  emails: string[]
}): Promise<boolean> {
  const or = identityOrClause(input)
  if (or.length === 0) return false

  const where = { OR: or }
  const select = { status: true } as const

  const [personal, team, business] = await Promise.all([
    prisma.subscription.findFirst({ where, select }),
    prisma.teamSubscription.findFirst({ where, select }),
    prisma.businessSubscription.findFirst({ where, select }),
  ])

  for (const row of [personal, team, business]) {
    if (row && !isTerminalSubscriptionStatus(row.status)) return true
  }
  return false
}
