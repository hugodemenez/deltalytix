'use server'
import { PrismaClient, Trade, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { Widget, Layouts } from '@/app/[locale]/(dashboard)/types/dashboard'
import { createClient } from './auth'
import { parseISO, startOfDay, endOfDay } from 'date-fns'
import { CalendarEntry } from '@/types/calendar'
import { generateAIComment } from './generate-ai-comment'
import { getSubscriptionDetails } from './subscription'
import { prisma } from '@/lib/prisma'

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

export async function saveTrades(data: Trade[]): Promise<TradeResponse> {
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

export async function getTrades(userId: string, isSubscribed: boolean): Promise<Trade[]> {
  try {
    const where: Prisma.TradeWhereInput = { userId }
    
    // If not subscribed, limit to last week's trades
    if (!isSubscribed) {
      const oneWeekAgo = startOfDay(new Date())
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      where.entryDate = {
        gte: oneWeekAgo.toISOString().split('T')[0]
      }

      console.log('[getTrades] Limiting to last week for non-subscribed user:', { 
        userId,
        fromDate: oneWeekAgo.toISOString()
      })
    }
    
    const trades = await prisma.trade.findMany({ 
      where,
      orderBy: { entryDate: 'desc' }
    })
    
    return trades.map(trade => ({
      ...trade,
      entryDate: new Date(trade.entryDate).toISOString(),
      exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
    }))
  } catch (error) {
    console.error('[getTrades] Database error:', error)
    return []
  }
}

export async function updateTradesWithComment(dayData: CalendarEntry, dateString: string) {
  try {
    const { comment, emotion } = await generateAIComment(dayData, dateString)
    const tradeIds = dayData.trades.map(trade => trade.id)

    // Update all trades for the day with the generated comment
    await prisma.trade.updateMany({
      where: { id: { in: tradeIds } },
      data: { comment: `${comment} (Emotion: ${emotion})` }
    })

    return { comment, emotion }
  } catch (error) {
    console.error("[updateTradesWithComment] Database error:", error)
    throw error
  }
}

export async function updateTradeComment(tradeId: string, comment: string | null) {
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

export async function updateTradeVideoUrl(tradeId: string, videoUrl: string | null) {
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

export async function loadDashboardLayout(userId: string): Promise<Layouts | null> {
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

export async function saveDashboardLayout(userId: string, layouts: Layouts): Promise<Layouts | null> {
  if (!userId || !layouts) {
    console.error('[saveDashboardLayout] Invalid input:', { userId, hasLayouts: !!layouts })
    return null
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
    
    return {
      desktop: JSON.parse(dashboard.desktop as string) as Widget[],
      mobile: JSON.parse(dashboard.mobile as string) as Widget[]
    }
  } catch (error) {
    console.error('[saveDashboardLayout] Database error:', error)
    return null
  }
}
