'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { createClient, signOut } from '@/server/auth'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'
import { stripe } from '@/server/stripe'

const TRADE_IMAGES_BUCKET = 'trade-images'
const TRADE_IMAGE_FOLDERS = ['trades', 'journal'] as const

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
    // Attempted cleanup — Stripe may retain invoices under its own legal
    // retention. Surface the failure so operators can see it; do not block
    // local account wipe if Stripe is unreachable.
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
 * Remove screenshot and journal image objects under each user id prefix in the
 * public `trade-images` bucket. Best-effort: list failures are logged.
 */
export async function deleteUserTradeImageObjects(
  userIds: string[],
): Promise<{ removed: number }> {
  if (userIds.length === 0 || isLocalDashboardAuthBypassEnabled()) {
    return { removed: 0 }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    console.error('[delete-account] Missing Supabase credentials for storage cleanup')
    return { removed: 0 }
  }

  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let removed = 0
  for (const userId of userIds) {
    for (const folder of TRADE_IMAGE_FOLDERS) {
      const prefix = `${userId}/${folder}`
      const { data, error } = await admin.storage
        .from(TRADE_IMAGES_BUCKET)
        .list(prefix, { limit: 1000 })
      if (error) {
        console.error('[delete-account] storage list failed:', prefix, error.message)
        continue
      }
      const paths = (data ?? [])
        .map((entry) => entry.name)
        .filter(Boolean)
        .map((name) => `${prefix}/${name}`)
      if (paths.length === 0) continue
      const { error: removeError } = await admin.storage
        .from(TRADE_IMAGES_BUCKET)
        .remove(paths)
      if (removeError) {
        console.error(
          '[delete-account] storage remove failed:',
          prefix,
          removeError.message,
        )
        continue
      }
      removed += paths.length
    }
  }
  return { removed }
}

/**
 * Order matters: TradeAnalytics has no FK to Trade, so delete analytics by
 * trade id before trades. RithmicProtocolFill has a bare userId string (no
 * User FK), so delete fills explicitly.
 */
export async function deleteUserTradeRelatedRows(
  tx: {
    trade: {
      findMany: (args: {
        where: { userId: { in: string[] } }
        select: { id: true }
      }) => Promise<{ id: string }[]>
      deleteMany: (args: {
        where: { userId: { in: string[] } }
      }) => Promise<unknown>
    }
    tradeAnalytics: {
      deleteMany: (args: {
        where: { tradeId: { in: string[] } }
      }) => Promise<unknown>
    }
    rithmicProtocolFill: {
      deleteMany: (args: {
        where: { userId: { in: string[] } }
      }) => Promise<unknown>
    }
  },
  userIds: string[],
): Promise<{ tradeIds: string[] }> {
  if (userIds.length === 0) return { tradeIds: [] }

  const trades = await tx.trade.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  })
  const tradeIds = trades.map((trade) => trade.id)
  if (tradeIds.length > 0) {
    await tx.tradeAnalytics.deleteMany({
      where: { tradeId: { in: tradeIds } },
    })
  }
  await tx.rithmicProtocolFill.deleteMany({
    where: { userId: { in: userIds } },
  })
  await tx.trade.deleteMany({ where: { userId: { in: userIds } } })
  return { tradeIds }
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

  // Storage cleanup before the DB wipe so prefixes still match live user ids.
  await deleteUserTradeImageObjects(userIds)

  await prisma.$transaction(async (tx) => {
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
  })

  await deleteSupabaseAuthUser(user.id)
  await signOut()
}
