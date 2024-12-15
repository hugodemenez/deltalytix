'use server'
import { PrismaClient, Trade } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { Widget, Layouts } from '@/app/[locale]/(dashboard)/types/dashboard'
import { createClient } from './auth'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

export async function saveTrades(data: Trade[]): Promise<{ error: any, numberOfTradesAdded: number }> {
    console.log('saveTrades', data)
    const prisma = new PrismaClient()
    let count = 0
    try{
        // Standardize date format for all trades before saving
        const formattedData = data.map(trade => ({
            ...trade,
            entryDate: new Date(trade.entryDate).toISOString(),
            closeDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
        }))

        const result = await prisma.trade.createMany({data:formattedData,skipDuplicates: true})
        count = result.count
    }catch(e){
        console.error(e)
        return {error:e, numberOfTradesAdded:0}
    }
    await prisma.$disconnect()
    revalidatePath('/')
    return {error:count===0?true:false, numberOfTradesAdded:count}
}

export async function getTrades(userId: string): Promise<Trade[]> {
  const prisma = new PrismaClient()
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting user:', error)
      return []
    }
    
    const email = user?.email
    const isSubscribed = email ? await getIsSubscribed(email) : false
    
    let where: any = { userId }
    
    if (!email || !isSubscribed) {
      const oneMonthAgo = startOfDay(new Date())
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      
      where.entryDate = {
        gte: oneMonthAgo.toISOString().split('T')[0]
      }
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
    console.error('Error fetching trades:', error)
    return []
  } finally {
    await prisma.$disconnect()
  }
}

import { CalendarEntry } from '@/types/calendar'
import { generateAIComment } from './generate-ai-comment'
import { getIsSubscribed } from './subscription'

export async function updateTradesWithComment(dayData: CalendarEntry, dateString: string) {
    const prisma = new PrismaClient()
  try {
    const { comment, emotion } = await generateAIComment(dayData, dateString)

    // Update all trades for the day with the generated comment
    await prisma.trade.updateMany({
      where: {
        id: {
          in: dayData.trades.map(trade => trade.id)
        }
      },
      data: {
        comment: `${comment} (Emotion: ${emotion})`
      }
    })

    return { comment, emotion }
  } catch (error) {
    console.error("Error updating trades with comment:", error)
    throw error
  }
}

export async function loadDashboardLayout(userId: string): Promise<Layouts | null> {
  const prisma = new PrismaClient()
  
  try {
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { userId },
    })
    
    await prisma.$disconnect()

    if (!dashboard) return null

    // Safely parse JSON with fallback to empty arrays
    const parseJsonSafely = (jsonString: any) => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : []
      } catch (e) {
        return []
      }
    }

    return {
      desktop: parseJsonSafely(dashboard.desktop) as Widget[],
      mobile: parseJsonSafely(dashboard.mobile) as Widget[]
    }
  } catch (error) {
    console.error('Error loading dashboard layout:', error)
    await prisma.$disconnect()
    return null
  }
}

export async function saveDashboardLayout(userId: string, layouts: Layouts) {
  const prisma = new PrismaClient()

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
    
    await prisma.$disconnect()
    
    return {
      desktop: JSON.parse(dashboard.desktop as string) as Widget[],
      mobile: JSON.parse(dashboard.mobile as string) as Widget[]
    }
  } catch (error) {
    console.error('Error saving dashboard layout:', error)
    await prisma.$disconnect()
    return null
  }
}
