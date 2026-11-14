import 'server-only'

import { prisma } from '@/lib/prisma'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { cancelStripeCustomersByIds } from '@/server/account-deletion/stripe'
import { deleteUserTradeImageObjects } from '@/server/account-deletion/storage'
import { supabaseAuthUserExists } from '@/server/account-deletion/supabase-auth'
import { failureKindFromFlags } from '@/server/account-deletion/failure-kind'
import { isUuid } from '@/server/account-deletion/id-format'

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
  dryRun?: boolean
}

async function userRowExistsForId(id: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id }, { auth_user_id: id }],
    },
    select: { id: true },
  })
  return Boolean(user)
}

/**
 * Storage prefixes: always refuse if a User row reuses the id.
 * Supabase auth lookup only for UUID prefixes (legacy cuid prefixes skip it
 * so retries can finish when no User row exists).
 */
export async function prefixIsReoccupied(prefix: string): Promise<boolean> {
  if (await userRowExistsForId(prefix)) return true
  if (!isUuid(prefix)) return false
  return supabaseAuthUserExists(prefix)
}

async function accountIsLiveAgain(
  authUserId: string,
  formerUserId?: string | null,
): Promise<boolean> {
  if (await userRowExistsForId(authUserId)) return true
  if (formerUserId && (await userRowExistsForId(formerUserId))) return true
  if (isUuid(authUserId) && (await supabaseAuthUserExists(authUserId))) {
    return true
  }
  return false
}

/**
 * Retry unresolved PendingAccountCleanup rows (storage + Stripe only).
 * Deletes the queue row when work succeeds (no resolved retention).
 * Never resolves STRIPE work with an empty customer id list.
 * Dry-run performs no deletes or purges and reports non-ok.
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

  if (options?.dryRun) {
    return rows.map((row) => ({
      id: row.id,
      ok: false,
      dryRun: true,
      storageError: 'dry-run; no changes applied',
      stripeError: 'dry-run; no changes applied',
    }))
  }

  if (isLocalDashboardAuthBypassEnabled()) {
    return rows.map((row) => ({
      id: row.id,
      ok: false,
      storageError: 'refusing cleanup under LOCAL_DASHBOARD_AUTH_BYPASS',
      stripeError: 'refusing cleanup under LOCAL_DASHBOARD_AUTH_BYPASS',
    }))
  }

  const results: RetryPendingCleanupResult[] = []
  for (const row of rows) {
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
      } else if (await accountIsLiveAgain(row.authUserId, row.formerUserId)) {
        stripeError =
          'refusing Stripe cancel; auth or User record is live again'
      } else {
        const stripe = await cancelStripeCustomersByIds(row.stripeCustomerIds)
        if (!stripe.ok) stripeError = stripe.error
      }
    }

    const ok = !storageError && !stripeError
    if (ok) {
      await prisma.pendingAccountCleanup.delete({
        where: { id: row.id },
      })
    }

    results.push({
      id: row.id,
      ok,
      storageError,
      stripeError,
    })
  }
  return results
}
