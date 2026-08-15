'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { createClient, signOut } from '@/server/auth'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { stripe } from '@/server/stripe'

async function cancelStripeForEmail(email: string): Promise<void> {
  if (isLocalDashboardAuthBypassEnabled()) return

  try {
    const customers = await stripe.customers.list({ email, limit: 10 })
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
      })
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          await stripe.subscriptions.cancel(subscription.id)
        }
      }
      await stripe.customers.del(customer.id)
    }
  } catch (error) {
    console.error('[delete-account] Stripe cleanup failed:', error)
  }
}

async function deleteSupabaseAuthUser(authUserId: string): Promise<void> {
  if (isLocalDashboardAuthBypassEnabled()) return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    throw new Error('Unable to delete the auth user')
  }

  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await admin.auth.admin.deleteUser(authUserId)
  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Wipe the signed-in user's account. Server-side only; no admin path.
 * Trades have no User FK, so they are deleted explicitly before the user row.
 */
export async function deleteCurrentUserAccount(): Promise<void> {
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
        (id): id is string => Boolean(id)
      )
    )
  )
  const emails = Array.from(
    new Set(
      [email, prismaUser?.email]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
    )
  )

  for (const userEmail of emails) {
    await cancelStripeForEmail(userEmail)
  }

  await prisma.$transaction(async (tx) => {
    if (userIds.length > 0) {
      await tx.trade.deleteMany({ where: { userId: { in: userIds } } })
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
  })

  await deleteSupabaseAuthUser(user.id)
  await signOut()
}
