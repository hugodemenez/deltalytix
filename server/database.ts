'use server'
import { PrismaClient, Trade } from '@prisma/client'
import { revalidatePath } from 'next/cache'


export async function saveTrades(data: Trade[]) {
  console.log('data', data)
    const prisma = new PrismaClient()
    await prisma.trade.createMany({data:data,skipDuplicates: true}).catch((e) => {
        console.error(e)
        return {error:e, trades:[]}
    }
    )
    await prisma.$disconnect()
    revalidatePath('/')
    return {error:null, trades:data}
}

export async function getTrades(userId: string) {
    const prisma = new PrismaClient()
    const trades = await prisma.trade.findMany({where: {userId: userId}})
    await prisma.$disconnect()
    return trades
}

import { CalendarEntry } from '@/lib/types'
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

export async function getTickDetails() {
  const prisma = new PrismaClient()
  const tickDetails = await prisma.tickDetails.findMany()
  await prisma.$disconnect()
  return tickDetails
}

export async function getIsSubscribed(email: string) {
  const prisma = new PrismaClient()
  const subscription = await prisma.subscription.findUnique({where: {email: email}})
  await prisma.$disconnect()
  return subscription
}