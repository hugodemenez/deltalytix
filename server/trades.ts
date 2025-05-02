'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
  try {
    // Get all trades that have this tag
    const trades = await prisma.trade.findMany({
      where: {
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

    revalidatePath('/')
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
