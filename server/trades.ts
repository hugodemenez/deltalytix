'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getUserId } from './auth'

export async function addTagToTrade(tradeId: string, tag: string) {
    try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { tags: true }
    })

    if (!trade) {
      throw new Error('Trade not found')
    }

    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        tags: {
          push: tag.trim()
        }
      }
    })

    revalidatePath('/')
    return updatedTrade
  } catch (error) {
    console.error('Failed to add tag:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export async function removeTagFromTrade(tradeId: string, tagToRemove: string) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { tags: true }
    })

    if (!trade) {
      throw new Error('Trade not found')
    }

    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        tags: {
          set: trade.tags.filter(tag => tag !== tagToRemove)
        }
      }
    })

    revalidatePath('/')
    return updatedTrade
  } catch (error) {
    console.error('Failed to remove tag:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export async function deleteTagFromAllTrades(tag: string) {
  const userId = await getUserId()
  try {
    // Get all trades that have this tag
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        tags: {
          has: tag
        }
      }
    })

    // Update all trades to remove the tag
    await Promise.all(
      trades.map(trade =>
        prisma.trade.update({
          where: { id: trade.id },
          data: {
            tags: {
              set: trade.tags.filter(t => t !== tag)
            }
          }
        })
      )
    )

    revalidateTag(userId, { expire: 0 })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete tag:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export async function updateTradeImage(
  tradeIds: string[], 
  imageData: string | null, 
  field: 'imageBase64' | 'imageBase64Second' = 'imageBase64'
) {
  console.log('Updating trade image:', tradeIds)
  try {
    // Verify all trades exist
    const trades = await prisma.trade.findMany({
      where: { id: { in: tradeIds } }
    })

    if (trades.length !== tradeIds.length) {
      throw new Error('Some trades not found')
    }

    // Update all trades with the image data (can be base64 or URL)
    await prisma.trade.updateMany({
      where: { id: { in: tradeIds } },
      data: {
        [field]: imageData
      }
    })

    revalidatePath('/')
    return trades
  } catch (error) {
    console.error('Failed to update trade image:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export async function addTagsToTradesForDay(date: string, tags: string[]) {
  const userId = await getUserId()
  try {
    // Parse the date string and get the start and end of the day
    const targetDate = new Date(date + 'T00:00:00Z')
    const nextDay = new Date(targetDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    const nextDayStr = nextDay.toISOString().split('T')[0]

    // Find all trades for this user on this date
    // Trade dates are stored as strings in format 'YYYY-MM-DD'
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        OR: [
          {
            entryDate: {
              gte: date,
              lt: nextDayStr
            }
          },
          {
            closeDate: {
              gte: date,
              lt: nextDayStr
            }
          }
        ]
      }
    })

    // Update each trade to add the new tags
    await Promise.all(
      trades.map(trade =>
        prisma.trade.update({
          where: { id: trade.id },
          data: {
            tags: {
              set: Array.from(new Set([...trade.tags, ...tags]))
            }
          }
        })
      )
    )

    revalidatePath('/')
    return { success: true, tradesUpdated: trades.length }
  } catch (error) {
    console.error('Failed to add tags to trades for day:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}
