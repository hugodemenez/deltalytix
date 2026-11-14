import 'server-only'

import { prisma } from '@/lib/prisma'
import { cancelStripeCustomersByIds } from '@/server/account-deletion/stripe'
import { deleteUserTradeImageObjects } from '@/server/account-deletion/storage'
import { failureKindFromFlags } from '@/server/account-deletion/failure-kind'

export type RecordPendingCleanupInput = {
  formerUserId?: string | null
  authUserId: string
  storagePrefixes: string[]
  stripeCustomerIds: string[]
  storageFailed: boolean
  stripeFailed: boolean
}

export { failureKindFromFlags } from '@/server/account-deletion/failure-kind'

/** Persist a durable cleanup task after the user row is gone. */
export async function recordPendingAccountCleanup(
  input: RecordPendingCleanupInput,
): Promise<{ id: string } | null> {
  if (!input.storageFailed && !input.stripeFailed) return null

  const row = await prisma.pendingAccountCleanup.create({
    data: {
      formerUserId: input.formerUserId ?? null,
      authUserId: input.authUserId,
      storagePrefixes: input.storagePrefixes,
      stripeCustomerIds: input.stripeCustomerIds,
      failureKind: failureKindFromFlags(
        input.storageFailed,
        input.stripeFailed,
      ),
    },
    select: { id: true },
  })
  return row
}

export type RetryPendingCleanupResult = {
  id: string
  ok: boolean
  storageError?: string
  stripeError?: string
}

/**
 * Retry unresolved PendingAccountCleanup rows (storage + Stripe only).
 * Marks resolvedAt when both succeed.
 */
export async function retryPendingAccountCleanups(options?: {
  id?: string
  dryRun?: boolean
}): Promise<RetryPendingCleanupResult[]> {
  const rows = await prisma.pendingAccountCleanup.findMany({
    where: {
      resolvedAt: null,
      ...(options?.id ? { id: options.id } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })

  const results: RetryPendingCleanupResult[] = []
  for (const row of rows) {
    if (options?.dryRun) {
      results.push({ id: row.id, ok: true })
      continue
    }

    let storageError: string | undefined
    let stripeError: string | undefined

    const needsStorage =
      row.failureKind === 'STORAGE' || row.failureKind === 'BOTH'
    const needsStripe =
      row.failureKind === 'STRIPE' || row.failureKind === 'BOTH'

    if (needsStorage && row.storagePrefixes.length > 0) {
      const storage = await deleteUserTradeImageObjects(row.storagePrefixes)
      if (storage.error) storageError = storage.error
    }

    if (needsStripe && row.stripeCustomerIds.length > 0) {
      const stripe = await cancelStripeCustomersByIds(row.stripeCustomerIds)
      if (!stripe.ok) stripeError = stripe.error
    }

    const ok = !storageError && !stripeError
    if (ok) {
      await prisma.pendingAccountCleanup.update({
        where: { id: row.id },
        data: { resolvedAt: new Date() },
      })
    }

    results.push({ id: row.id, ok, storageError, stripeError })
  }
  return results
}
