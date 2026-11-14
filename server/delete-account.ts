'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/server/auth'
import { cancelStripeForEmail } from '@/server/account-deletion/stripe'
import { deleteUserTradeImageObjects } from '@/server/account-deletion/storage'
import { deleteUserTradeRelatedRows } from '@/server/account-deletion/trade-rows'
import { deleteSupabaseAuthUser } from '@/server/account-deletion/supabase-auth'
import { recordPendingAccountCleanup } from '@/server/account-deletion/pending-cleanup'
import type { DeleteAccountResult } from '@/server/account-deletion/types'

/**
 * Wipe the signed-in user's account. Server-side only; no admin path.
 * Order: database first, then storage files, then Stripe, then auth user.
 * Signs out the session without a server redirect so the client can navigate
 * to a landing notice. Partial storage/Stripe failures are recorded in
 * PendingAccountCleanup; the auth user is always deleted to avoid zombie login.
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
  const stripeCustomerIds: string[] = []
  for (const userEmail of emails) {
    const stripeResult = await cancelStripeForEmail(userEmail)
    stripeCustomerIds.push(...stripeResult.customerIds)
    if (!stripeResult.ok) {
      stripeError = stripeResult.error ?? 'Stripe cleanup failed'
    }
  }

  const storageFailed = Boolean(storage.error)
  const stripeFailed = Boolean(stripeError)
  if (storageFailed || stripeFailed) {
    const pending = await recordPendingAccountCleanup({
      formerUserId: prismaUser?.id ?? null,
      authUserId: user.id,
      storagePrefixes: userIds,
      stripeCustomerIds: Array.from(new Set(stripeCustomerIds)),
      storageFailed,
      stripeFailed,
    })
    console.error('[delete-account] partial success; queued PendingAccountCleanup', {
      pendingId: pending?.id,
      storageError: storage.error,
      stripeError,
    })
  }

  await deleteSupabaseAuthUser(user.id)

  // Session sign-out without redirect so the client can navigate to a notice.
  await supabase.auth.signOut()

  return {
    status: storageFailed || stripeFailed ? 'partial' : 'complete',
  }
}
