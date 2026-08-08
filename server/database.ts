'use server'
import { Trade, Prisma, DashboardLayout } from '@/prisma/generated/prisma/client'
import { revalidatePath, revalidateTag, updateTag } from 'next/cache'
import { Widget, Layouts } from '@/app/[locale]/dashboard/types/dashboard'
import { createClient, getUserId } from './auth'
import { startOfDay } from 'date-fns'
import { getSubscriptionDetails } from './subscription'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { defaultLayouts } from '@/lib/default-layouts'
import { formatTimestamp } from '@/lib/date-utils'

type TradeError =
  | 'DUPLICATE_TRADES'
  | 'NO_TRADES_ADDED'
  | 'DATABASE_ERROR'
  | 'INVALID_DATA'
  | 'UNAUTHORIZED'

interface TradeResponse {
  error: TradeError | false
  numberOfTradesAdded: number
  details?: unknown
  /** Trades prepared with server-assigned IDs/accountIds for client merge */
  trades?: Trade[]
}

export async function revalidateCache(tags: string[]) {
  const userId = await getUserId()
  const { filterSessionScopedCacheTags } = await import('@/lib/cache-tag-scope')
  const scopedTags = filterSessionScopedCacheTags(tags, userId)

  if (scopedTags.length === 0) {
    console.warn('[revalidateCache] No session-scoped tags to revalidate')
    return
  }

  console.log(`[revalidateCache] Starting cache invalidation for tags:`, scopedTags)

  scopedTags.forEach(tag => {
    try {
      console.log(`[revalidateCache] Revalidating tag: ${tag}`)
      updateTag(tag)
      console.log(`[revalidateCache] Successfully revalidated tag: ${tag}`)
    } catch (error) {
      console.error(`[revalidateCache] Error revalidating tag ${tag}:`, error)
    }
  })

  console.log(`[revalidateCache] Completed cache invalidation for ${scopedTags.length} tags`)
}

export async function saveTradesAction(
  data: Trade[],
  options?: { userId?: string; connectionId?: string | null }
): Promise<TradeResponse> {
  // Public server action: owner always comes from the session. Trusted callers
  // without a cookie session (cron sync, Thor/ETP token routes) must import
  // persistTradesForUser from server/trades-persist instead.
  const sessionUserId = await getUserId()
  if (options?.userId && options.userId !== sessionUserId) {
    return {
      error: 'UNAUTHORIZED',
      numberOfTradesAdded: 0,
      details: 'Cannot save trades for another user',
    }
  }

  const { persistTradesForUser } = await import('@/server/trades-persist')
  return persistTradesForUser(sessionUserId, data, {
    connectionId: options?.connectionId,
  })
}

// Create cache function dynamically for each user/subscription combination
function getCachedTrades(userId: string, isSubscribed: boolean, page: number, chunkSize: number): Promise<Trade[]> {
  return unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching trades for user ${userId}, subscribed: ${isSubscribed}`)

      const query: any = {
        where: { userId },
        orderBy: { entryDate: 'desc' },
        skip: (page - 1) * chunkSize,
        take: chunkSize
      }

      if (!isSubscribed) {
        const twoWeeksAgo = startOfDay(new Date())
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        query.where.entryDate = { gte: twoWeeksAgo.toISOString() }
      }

      return await prisma.trade.findMany(query)
    },
    // Static string array - this is the cache key
    [`trades-${userId}-${isSubscribed}-${page}`],
    {
      tags: [`trades-${userId}`], // User-specific tag for revalidation
      revalidate: 3600 // Revalidate every hour (3600 seconds)
    }
  )()  // Note the () at the end - we call the cached function immediately
}


export async function getTradesAction(forceRefresh: boolean = false): Promise<Trade[]> {
  // Always derive userId from auth — never accept a client-provided userId
  const userId = await getUserId()

  const subscriptionDetails = await getSubscriptionDetails()
  const isSubscribed = subscriptionDetails?.isActive || false

  // If forceRefresh is true, bypass cache and fetch directly
  if (forceRefresh) {
    console.log(`[getTrades] Force refresh - bypassing cache for user ${userId}`)
    updateTag(`trades-${userId}`)

    const query: any = {
      where: {
        userId,
      },
      orderBy: { entryDate: 'desc' }
    }
    if (!isSubscribed) {
      const twoWeeksAgo = startOfDay(new Date())
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      query.where.entryDate = { gte: twoWeeksAgo.toISOString() }
    }

    const trades = await prisma.trade.findMany(query)
    console.log(`[getTrades] Force refresh - Found ${trades.length} trades`)

    return trades.map(trade => ({
      ...trade,
      entryDate: new Date(trade.entryDate).toISOString(),
      exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
    }))
  }

  // Get cached trades
  // Per page
  const query: any = {
    where: {
      userId,
    }
  }
  if (!isSubscribed) {
    const twoWeeksAgo = startOfDay(new Date())
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    query.where.entryDate = { gte: twoWeeksAgo.toISOString() }
  }
  const count = await prisma.trade.count(query)
  // Split pages by chunks of 1000
  const chunkSize = 1000
  const totalPages = Math.ceil(count / chunkSize)
  const trades: Trade[] = []
  for (let page = 1; page <= totalPages; page++) {
    const pageTrades = await getCachedTrades(userId, isSubscribed, page, chunkSize)
    trades.push(...pageTrades)
  }
  console.log(`[getTrades] Found ${count} trades fetched ${trades.length}`)

  // Tell the server that the trades have changed
  // Next page reload will fetch the new trades instead of using the cached data
  return trades.map(trade => ({
    ...trade,
    entryDate: new Date(trade.entryDate).toISOString(),
    exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
  }))
}

export async function updateTradesAction(tradesIds: string[], update: Partial<Trade> & {
  entryDateOffset?: number
  closeDateOffset?: number
  instrumentTrim?: { fromStart: number; fromEnd: number }
  instrumentPrefix?: string
  instrumentSuffix?: string
}): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return 0
    }

    // Handle special offset operations
    if (update.entryDateOffset !== undefined || update.closeDateOffset !== undefined) {
      const trades = await prisma.trade.findMany({
        where: { id: { in: tradesIds }, userId },
        select: { id: true, entryDate: true, closeDate: true }
      })

      for (const trade of trades) {
        const updateData: any = {}

        if (update.entryDateOffset !== undefined && update.entryDateOffset !== 0) {
          const entryDate = new Date(trade.entryDate)
          entryDate.setHours(entryDate.getHours() + update.entryDateOffset)
          updateData.entryDate = formatTimestamp(entryDate.toISOString())
        }

        if (update.closeDateOffset !== undefined && update.closeDateOffset !== 0) {
          const closeDate = new Date(trade.closeDate)
          closeDate.setHours(closeDate.getHours() + update.closeDateOffset)
          updateData.closeDate = formatTimestamp(closeDate.toISOString())
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.trade.update({
            where: { id: trade.id },
            data: updateData
          })
        }
      }
    }

    // Handle instrument modifications
    if (update.instrumentTrim || update.instrumentPrefix || update.instrumentSuffix) {
      const trades = await prisma.trade.findMany({
        where: { id: { in: tradesIds }, userId },
        select: { id: true, instrument: true }
      })

      for (const trade of trades) {
        let newInstrument = trade.instrument

        if (update.instrumentTrim) {
          const { fromStart, fromEnd } = update.instrumentTrim
          newInstrument = newInstrument.substring(fromStart, newInstrument.length - fromEnd)
        }

        if (update.instrumentPrefix) {
          newInstrument = update.instrumentPrefix + newInstrument
        }

        if (update.instrumentSuffix) {
          newInstrument = newInstrument + update.instrumentSuffix
        }

        await prisma.trade.update({
          where: { id: trade.id },
          data: { instrument: newInstrument }
        })
      }
    }

    // Handle normal updates (excluding special fields)
    const normalUpdate = { ...update }
    delete normalUpdate.entryDateOffset
    delete normalUpdate.closeDateOffset
    delete normalUpdate.instrumentTrim
    delete normalUpdate.instrumentPrefix
    delete normalUpdate.instrumentSuffix

    let result = { count: 0 }
    if (Object.keys(normalUpdate).length > 0) {
      result = await prisma.trade.updateMany({
        where: { id: { in: tradesIds }, userId },
        data: normalUpdate
      })
    }

    updateTag(`trades-${userId}`)

    return tradesIds.length // Return the number of trades processed
  } catch (error) {
    console.error('[updateTrades] Database error:', error)
    return 0
  }
}

export async function updateTradeCommentAction(tradeId: string, comment: string | null) {
  const userId = await getUserId()
  if (!userId) {
    throw new Error('User not found')
  }

  try {
    await prisma.trade.update({
      where: { id: tradeId, userId },
      data: { comment }
    })
    revalidatePath('/')
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[updateTradeComment] Known database error:", {
        code: error.code,
        message: error.message
      })
    } else {
      console.error("[updateTradeComment] Unknown error:", error)
    }
    throw error
  }
}

export async function updateTradeVideoUrlAction(tradeId: string, videoUrl: string | null) {
  const userId = await getUserId()
  if (!userId) {
    throw new Error('User not found')
  }
  try {
    await prisma.trade.update({
      where: { id: tradeId, userId },
      data: { videoUrl }
    })
    revalidatePath('/')
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[updateTradeVideoUrl] Known database error:", {
        code: error.code,
        message: error.message
      })
    } else {
      console.error("[updateTradeVideoUrl] Unknown error:", error)
    }
    throw error
  }
}

export async function loadDashboardLayoutAction(): Promise<Layouts | null> {
  const userId = await getUserId()
  if (!userId) {
    throw new Error('User not found')
  }
  try {
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { userId },
    })

    if (!dashboard) {
      console.log('[loadDashboardLayout] No layout found for user:', userId)
      return null
    }

    // Safely parse JSON with fallback to empty arrays
    const parseJsonSafely = (jsonString: any): Widget[] => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : []
      } catch (error) {
        console.error('[loadDashboardLayout] JSON parse error:', error)
        return []
      }
    }

    return {
      desktop: parseJsonSafely(dashboard.desktop),
      mobile: parseJsonSafely(dashboard.mobile)
    }
  } catch (error) {
    console.error('[loadDashboardLayout] Database error:', error)
    return null
  }
}

export async function saveDashboardLayoutAction(layouts: DashboardLayout): Promise<void> {
  const userId = await getUserId()
  if (!userId || !layouts) {
    console.error('[saveDashboardLayout] Invalid input:', { userId, hasLayouts: !!layouts })
    return
  }

  try {
    // Ensure layouts are valid arrays before stringifying
    const desktopLayout = Array.isArray(layouts.desktop) ? layouts.desktop : []
    const mobileLayout = Array.isArray(layouts.mobile) ? layouts.mobile : []

    await prisma.dashboardLayout.upsert({
      where: { userId },
      update: {
        desktop: JSON.stringify(desktopLayout),
        mobile: JSON.stringify(mobileLayout),
        updatedAt: new Date()
      },
      create: {
        userId,
        desktop: JSON.stringify(desktopLayout),
        mobile: JSON.stringify(mobileLayout)
      },
    })

  } catch (error) {
    console.error('[saveDashboardLayout] Database error:', error)
  }
}

export async function createDefaultDashboardLayout(userId: string): Promise<void> {
  try {
    // If a layout already exists for this user, do nothing (idempotent)
    const existing = await prisma.dashboardLayout.findUnique({ where: { userId } })
    if (existing) {
      return
    }

    const desktopLayout = Array.isArray(defaultLayouts.desktop) ? defaultLayouts.desktop : []
    const mobileLayout = Array.isArray(defaultLayouts.mobile) ? defaultLayouts.mobile : []

    // Use upsert to guard against race conditions creating the same row concurrently
    await prisma.dashboardLayout.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        desktop: JSON.stringify(desktopLayout),
        mobile: JSON.stringify(mobileLayout)
      }
    })

    console.log('[createDefaultDashboardLayout] SUCCESS: Default layout ensured for user:', userId)
  } catch (error) {
    console.error('[createDefaultDashboardLayout] ERROR: Failed to create default layout:', error)
    throw error
  }
}

export async function groupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserId()
    if (!userId) {
      throw new Error('User not found')
    }
    // Generate a new group ID
    const groupId = crypto.randomUUID()

    // Update all selected trades with the new group ID
    await prisma.trade.updateMany({
      where: {
        id: { in: tradeIds },
        userId // Ensure we only update the user's own trades
      },
      data: { groupId }
    })

    revalidatePath('/')
    return true
  } catch (error) {
    console.error('[groupTrades] Database error:', error)
    return false
  }
}

export async function ungroupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserId()
    if (!userId) {
      throw new Error('User not found')
    }
    // Remove group ID from selected trades
    await prisma.trade.updateMany({
      where: {
        id: { in: tradeIds },
        userId // Ensure we only update the user's own trades
      },
      data: { groupId: "" }
    })

    revalidatePath('/')
    return true
  } catch (error) {
    console.error('[ungroupTrades] Database error:', error)
    return false
  }
}
