import 'server-only'

import { prisma } from '@/lib/prisma'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { cancelStripeCustomersByIds } from '@/server/account-deletion/stripe'
import { deleteUserTradeImageObjects } from '@/server/account-deletion/storage'
import { supabaseAuthUserExists } from '@/server/account-deletion/supabase-auth'
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

const RESOLVED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/** Persist a durable cleanup task after the user row is gone. */
export async function recordPendingAccountCleanup(
  input: RecordPendingCleanupInput,
): Promise<{ id: string } | null> {
  if (!input.storageFailed && !input.stripeFailed) return null

  // Never queue a Stripe-only row without customer ids — there is no retry path.
  if (
    input.stripeFailed &&
    !input.storageFailed &&
    input.stripeCustomerIds.length === 0
  ) {
    console.error(
      '[delete-account] refusing to queue STRIPE PendingAccountCleanup without customer ids',
      {
        formerUserId: input.formerUserId ?? null,
        authUserId: input.authUserId,
        storagePrefixes: input.storagePrefixes,
      },
    )
    return null
  }

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
  purgedResolved?: number
}

async function prefixIsReoccupied(prefix: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: prefix }, { auth_user_id: prefix }],
    },
    select: { id: true },
  })
  if (user) return true
  return supabaseAuthUserExists(prefix)
}

/**
 * Retry unresolved PendingAccountCleanup rows (storage + Stripe only).
 * Marks resolvedAt when work succeeds. Never resolves STRIPE work with an
 * empty customer id list. Purges rows resolved more than 30 days ago.
 */
export async function retryPendingAccountCleanups(options?: {
  id?: string
  dryRun?: boolean
}): Promise<RetryPendingCleanupResult[]> {
  const cutoff = new Date(Date.now() - RESOLVED_RETENTION_MS)
  const purged = await prisma.pendingAccountCleanup.deleteMany({
    where: {
      resolvedAt: { not: null, lt: cutoff },
    },
  })

  const rows = await prisma.pendingAccountCleanup.findMany({
    where: {
      resolvedAt: null,
      ...(options?.id ? { id: options.id } : {}),
    },
    orderBy: { createdAt: 'asc' },
  })

  if (isLocalDashboardAuthBypassEnabled()) {
    return rows.map((row) => ({
      id: row.id,
      ok: false,
      storageError: 'refusing cleanup under LOCAL_DASHBOARD_AUTH_BYPASS',
      stripeError: 'refusing cleanup under LOCAL_DASHBOARD_AUTH_BYPASS',
      purgedResolved: purged.count,
    }))
  }

  const results: RetryPendingCleanupResult[] = []
  for (const row of rows) {
    if (options?.dryRun) {
      results.push({ id: row.id, ok: true, purgedResolved: purged.count })
      continue
    }

    let storageError: string | undefined
    let stripeError: string | undefined

    const needsStorage =
      row.failureKind === 'STORAGE' || row.failureKind === 'BOTH'
    const needsStripe =
      row.failureKind === 'STRIPE' || row.failureKind === 'BOTH'

    if (needsStorage && row.storagePrefixes.length > 0) {
      let blockedPrefix: string | undefined
      for (const prefix of row.storagePrefixes) {
        if (await prefixIsReoccupied(prefix)) {
          blockedPrefix = prefix
          break
        }
      }
      if (blockedPrefix) {
        storageError = `refusing storage cleanup; id still in use: ${blockedPrefix}`
      } else {
        const storage = await deleteUserTradeImageObjects(row.storagePrefixes)
        if (storage.error) storageError = storage.error
      }
    }

    if (needsStripe) {
      if (row.stripeCustomerIds.length === 0) {
        stripeError =
          'missing Stripe customer ids; refusing to mark STRIPE cleanup resolved'
      } else {
        const stripe = await cancelStripeCustomersByIds(row.stripeCustomerIds)
        if (!stripe.ok) stripeError = stripe.error
      }
    }

    const ok = !storageError && !stripeError
    if (ok) {
      await prisma.pendingAccountCleanup.update({
        where: { id: row.id },
        data: { resolvedAt: new Date() },
      })
    }

    results.push({
      id: row.id,
      ok,
      storageError,
      stripeError,
      purgedResolved: purged.count,
    })
  }
  return results
}
