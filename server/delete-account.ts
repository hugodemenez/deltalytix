'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/server/auth'
import { isStripeSecretConfigured } from '@/lib/stripe-secret'
import {
  cancelStripeCustomersByIds,
  listStripeCustomerIdsForEmails,
} from '@/server/account-deletion/stripe'
import { hasLiveAppSubscription } from '@/server/account-deletion/live-subscription'
import { deleteUserTradeImageObjects } from '@/server/account-deletion/storage'
import { deleteUserTradeRelatedRows } from '@/server/account-deletion/trade-rows'
import { deleteSupabaseAuthUser } from '@/server/account-deletion/supabase-auth'
import { recordPendingAccountCleanup } from '@/server/account-deletion/pending-cleanup'
import { failureKindFromFlags } from '@/server/account-deletion/failure-kind'
import type { DeleteAccountResult } from '@/lib/account-deletion-result'

/**
 * Wipe the signed-in user's account. Server-side only; no admin path.
 * Order: Stripe customer id precheck → database → storage → Stripe cancel → auth.
 * Signs out without redirect so the client can navigate to a landing notice.
 */
export async function deleteCurrentUserAccount(): Promise<DeleteAccountResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    throw new Error('Unauthorized')
  }

  const email = user.email?.trim()
  const prismaUser = await prisma.user.findFirst({
    where: {
      OR: [{ auth_user_id: user.id }, { id: user.id }],
    },
  })

  const userIds = Array.from(
    new Set(
      [prismaUser?.id, prismaUser?.auth_user_id, user.id].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  )
  const emails = Array.from(
    new Set(
      [email, prismaUser?.email]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim()),
    ),
  )

  // When Stripe is not configured, still refuse if an app Subscription remains.
  if (
    !isStripeSecretConfigured() &&
    (await hasLiveAppSubscription({ userIds, emails }))
  ) {
    return { status: 'blocked', reason: 'billing_check_failed' }
  }

  // Fail closed when Stripe is configured and lookup fails. Structured result
  // (not a thrown message) so production clients still see the localised copy.
  const stripeLookup = await listStripeCustomerIdsForEmails(emails)
  if (!stripeLookup.ok) {
    return { status: 'blocked', reason: 'billing_check_failed' }
  }
  const stripeCustomerIds = stripeLookup.customerIds

  await prisma.$transaction(
    async (tx) => {
      if (userIds.length > 0) {
        await deleteUserTradeRelatedRows(tx, userIds)
        await tx.shared.deleteMany({ where: { userId: { in: userIds } } })

        const otherTeams = await tx.team.findMany({
          where: {
            userId: { notIn: userIds },
            OR: [
              { traderIds: { hasSome: userIds } },
              { managers: { some: { managerId: { in: userIds } } } },
            ],
          },
          select: { id: true, traderIds: true },
        })
        for (const team of otherTeams) {
          await tx.team.update({
            where: { id: team.id },
            data: {
              traderIds: team.traderIds.filter((id) => !userIds.includes(id)),
            },
          })
        }
        await tx.teamManager.deleteMany({
          where: { managerId: { in: userIds } },
        })

        const otherBusinesses = await tx.business.findMany({
          where: {
            userId: { notIn: userIds },
            OR: [
              { traderIds: { hasSome: userIds } },
              { managers: { some: { managerId: { in: userIds } } } },
            ],
          },
          select: { id: true, traderIds: true },
        })
        for (const business of otherBusinesses) {
          await tx.business.update({
            where: { id: business.id },
            data: {
              traderIds: business.traderIds.filter((id) => !userIds.includes(id)),
            },
          })
        }
        await tx.businessManager.deleteMany({
          where: { managerId: { in: userIds } },
        })
      }

      if (emails.length > 0) {
        await tx.newsletter.deleteMany({ where: { email: { in: emails } } })
        await tx.subscriptionFeedback.deleteMany({
          where: { email: { in: emails } },
        })
        await tx.teamInvitation.deleteMany({
          where: {
            OR: [{ email: { in: emails } }, { invitedBy: { in: userIds } }],
          },
        })
        await tx.businessInvitation.deleteMany({
          where: {
            OR: [{ email: { in: emails } }, { invitedBy: { in: userIds } }],
          },
        })
      }

      if (prismaUser) {
        await tx.user.delete({ where: { id: prismaUser.id } })
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  )

  const storage = await deleteUserTradeImageObjects(userIds)
  let stripeError: string | undefined
  if (stripeCustomerIds.length > 0) {
    const stripeResult = await cancelStripeCustomersByIds(stripeCustomerIds)
    if (!stripeResult.ok) {
      stripeError = stripeResult.error ?? 'Stripe cleanup failed'
    }
  }

  const storageFailed = Boolean(storage.error)
  const stripeFailed = Boolean(stripeError)
  let queueWriteFailed = false
  if (storageFailed || stripeFailed) {
    try {
      const pending = await recordPendingAccountCleanup({
        formerUserId: prismaUser?.id ?? null,
        authUserId: user.id,
        storagePrefixes: userIds,
        stripeCustomerIds,
        storageFailed,
        stripeFailed,
      })
      console.error(
        '[delete-account] partial success; queued PendingAccountCleanup',
        {
          pendingId: pending?.id,
          storageError: storage.error,
          stripeError,
        },
      )
    } catch (queueError) {
      queueWriteFailed = true
      console.error('[delete-account] Failed to queue PendingAccountCleanup', {
        formerUserId: prismaUser?.id ?? null,
        authUserId: user.id,
        storagePrefixes: userIds,
        stripeCustomerIds,
        failureKind: failureKindFromFlags(storageFailed, stripeFailed),
        queueError:
          queueError instanceof Error ? queueError.message : String(queueError),
      })
    }
  }

  // Keep auth if the durable queue write failed so operators can still act.
  if (!queueWriteFailed) {
    await deleteSupabaseAuthUser(user.id)
  }

  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    console.error('[delete-account] signOut failed:', signOutError.message)
    const { error: localSignOutError } = await supabase.auth.signOut({
      scope: 'local',
    })
    if (localSignOutError) {
      console.error(
        '[delete-account] local signOut failed:',
        localSignOutError.message,
      )
    }
  }

  if (queueWriteFailed) {
    return { status: 'partial_unrecorded' }
  }
  return {
    status: storageFailed || stripeFailed ? 'partial' : 'complete',
  }
}
