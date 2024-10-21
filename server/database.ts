'use server'
import { PrismaClient, Trade } from '@prisma/client'
import { revalidatePath } from 'next/cache'


export async function saveTrades(data: Trade[]): Promise<{ error: any, numberOfTradesAdded: number }> {
    const prisma = new PrismaClient()
    let count = 0
    try{
    const result = await prisma.trade.createMany({data:data,skipDuplicates: true})
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
  console.log('getTrades', userId)
    const prisma = new PrismaClient()
    const trades = await prisma.trade.findMany({where: {userId: userId}})
    await prisma.$disconnect()
    return trades
}

import { CalendarEntry } from '@/types/calendar'
import { generateAIComment } from './generate-ai-comment'

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
