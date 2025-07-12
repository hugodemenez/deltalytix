'use server'
import { Trade, Prisma, DashboardLayout } from '@prisma/client'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Widget, Layouts } from '@/app/[locale]/dashboard/types/dashboard'
import { createClient, getUserId } from './auth'
import { startOfDay } from 'date-fns'
import { getSubscriptionDetails } from './subscription'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

type TradeError = 
  | 'DUPLICATE_TRADES'
  | 'NO_TRADES_ADDED'
  | 'DATABASE_ERROR'
  | 'INVALID_DATA'

interface TradeResponse {
  error: TradeError | false
  numberOfTradesAdded: number
  details?: unknown
}

export async function revalidateCache(tags: string[]) {
  console.log(`[revalidateCache] Starting cache invalidation for tags:`, tags)
  
  tags.forEach(tag => {
    try {
      console.log(`[revalidateCache] Revalidating tag: ${tag}`)
      revalidateTag(tag)
      console.log(`[revalidateCache] Successfully revalidated tag: ${tag}`)
    } catch (error) {
      console.error(`[revalidateCache] Error revalidating tag ${tag}:`, error)
    }
  })
  
  console.log(`[revalidateCache] Completed cache invalidation for ${tags.length} tags`)
}

export async function saveTradesAction(data: Trade[]): Promise<TradeResponse> {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        error: 'INVALID_DATA',
        numberOfTradesAdded: 0,
        details: 'No trades provided'
      }
    }

    try {
      const result = await prisma.trade.createMany({
        data,
        skipDuplicates: true
      })
      
      // Log potential duplicates if no trades were added
      if (result.count === 0) {
        console.log('[saveTrades] No trades added. Checking for duplicates:', { attempted: data.length })
        const tradeIds = data.map(trade => trade.id)
        const existingTrades = await prisma.trade.findMany({
          where: { id: { in: tradeIds } },
          select: {
            id: true,
            entryDate: true,
            instrument: true
          }
        })

        if (existingTrades.length > 0) {
          console.log('[saveTrades] Found existing trades:', existingTrades)
          return {
            error: 'DUPLICATE_TRADES',
            numberOfTradesAdded: 0,
            details: existingTrades
          }
        }
      }

      revalidatePath('/')
      return {
        error: result.count === 0 ? 'NO_TRADES_ADDED' : false,
        numberOfTradesAdded: result.count
      }
    } catch(error) {
      console.error('[saveTrades] Database error:', error)
      return { 
        error: 'DATABASE_ERROR', 
        numberOfTradesAdded: 0,
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
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
        const oneWeekAgo = startOfDay(new Date())
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        query.where.entryDate = { gte: oneWeekAgo.toISOString() }
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


export async function getTradesAction(userId: string | null = null): Promise<Trade[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && !userId) {
      throw new Error('User not found')
    }

    const subscriptionDetails = await getSubscriptionDetails()
    const isSubscribed = subscriptionDetails?.isActive || false


    // Get cached trades
    // Per page
    const query: any = {
      where: { 
        userId: userId || user?.id,
       }
    }
    if (!isSubscribed) {
      const oneWeekAgo = startOfDay(new Date())
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      query.where.entryDate = { gte: oneWeekAgo.toISOString() }
    }
    const count = await prisma.trade.count(query)
    // Split pages by chunks of 1000
    const chunkSize = 1000
    const totalPages = Math.ceil(count / chunkSize)
    const trades: Trade[] = []
    for (let page = 1; page <= totalPages; page++) {
      const pageTrades = await getCachedTrades(userId || user?.id || '', isSubscribed, page, chunkSize)
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

export async function updateTradesAction(tradesIds: string[], update: Partial<Trade>): Promise<number> {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return 0
  }

  const result = await prisma.trade.updateMany({
    where: { id: { in: tradesIds }, userId },
    data: update
  })

  revalidateTag(`trades-${userId}`)

  return result.count
  } catch (error) {
    console.error('[updateTrades] Database error:', error)
    return 0
  }
}

export async function updateTradeCommentAction(tradeId: string, comment: string | null) {
  try {
    await prisma.trade.update({
      where: { id: tradeId },
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
  try {
    await prisma.trade.update({
      where: { id: tradeId },
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId || !layouts) {
    console.error('[saveDashboardLayout] Invalid input:', { userId, hasLayouts: !!layouts })
    return
  }

  try {
    // Ensure layouts are valid arrays before stringifying
    const desktopLayout = Array.isArray(layouts.desktop) ? layouts.desktop : []
    const mobileLayout = Array.isArray(layouts.mobile) ? layouts.mobile : []

    const dashboard = await prisma.dashboardLayout.upsert({
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

export async function groupTradesAction(tradeIds: string[]): Promise<boolean> {
  try {
    const userId = await getUserId()
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
