'use server'

import { Trade, Prisma, PrismaClient } from '@prisma/client'
import { endOfDay, startOfDay } from 'date-fns'
import { parseISO, isValid } from 'date-fns'
import { revalidatePath } from 'next/cache'

export interface SharedParams {
  userId: string
  title?: string
  description?: string
  isPublic: boolean
  accountNumbers: string[]
  dateRange: {
    from: Date
    to?: Date
  }
  desktop?: any[]
  mobile?: any[]
  expiresAt?: Date
  viewCount?: number
  createdAt?: Date
}


export async function createShared(data: SharedParams): Promise<string> {
  try {
    // Validate date range
    if (!data.dateRange?.from) {
      throw new Error('Start date is required')
    }

    // Validate account numbers
    if (!data.accountNumbers?.length) {
      throw new Error('At least one account number must be selected')
    }

    // Generate a unique slug
    let slug = generateSlug()
    let attempts = 0
    const maxAttempts = 5
    const prisma = new PrismaClient()

    // Keep trying to find a unique slug
    while (attempts < maxAttempts) {
      try {
        const sharedTrades = await prisma.shared.create({
          data: {
            userId: data.userId,
            title: data.title,
            description: data.description,
            isPublic: data.isPublic,
            accountNumbers: data.accountNumbers,
            dateRange: {
              from: data.dateRange.from.toISOString(),
              ...(data.dateRange.to && { to: data.dateRange.to.toISOString() })
            },
            desktop: data.desktop || [],
            mobile: data.mobile || [],
            expiresAt: data.expiresAt,
            slug,
          },
        })

        revalidatePath('/shared/[slug]', 'page')
        return slug
      } catch (error) {
        if ((error as any)?.code === 'P2002') {
          // P2002 is Prisma's error code for unique constraint violation
          slug = generateSlug()
          attempts++
          continue
        }
        throw error
      }
    }

    throw new Error('Failed to generate unique slug after multiple attempts')
  } catch (error) {
    console.error('Error creating shared trades:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to share trades: ${error.message}`)
    }
    throw new Error('An unexpected error occurred while sharing trades')
  }
}

export async function getShared(slug: string): Promise<{params: SharedParams, trades: Trade[]} | null> {
  const prisma = new PrismaClient()
  try {
    const shared = await prisma.shared.findUnique({
      where: { slug },
    })

    if (!shared) {
      return null
    }

    // Update view count
    await prisma.shared.update({
      where: { slug },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    })

    // Parse the date range from the shared data
    const dateRange = shared.dateRange as { from: string; to?: string | undefined }
    const fromDate = new Date(dateRange.from)
    // Only create toDate if it exists in the database
    const toDate = dateRange.to ? new Date(dateRange.to) : undefined

    // Fetch trades based on the stored parameters
    const trades = await prisma.trade.findMany({
      where: {
        userId: shared.userId,
        accountNumber: {
          in: shared.accountNumbers,
        },
        entryDate: {
          gte: fromDate.toISOString(),
          ...(toDate && { lte: toDate.toISOString() })
        }
      },
      orderBy: {
        entryDate: 'desc',
      },
    })

    if (trades.length > 0) {
      const dates = trades
        .map(trade => parseISO(trade.entryDate))
        .filter(date => isValid(date))

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(date => date.getTime())))
        const maxDate = new Date(Math.max(
          ...dates.map(date => date.getTime()),
          new Date().getTime()
        ))
      }
    }

    console.log('Found trades:', trades.length)

    return {
      params: {
        userId: shared.userId,
        title: shared.title || undefined,
        description: shared.description || undefined,
        isPublic: shared.isPublic,
        accountNumbers: shared.accountNumbers,
        dateRange: {
          from: fromDate,
          ...(toDate && { to: toDate })
        },
        desktop: shared.desktop as any[],
        mobile: shared.mobile as any[],
        expiresAt: shared.expiresAt || undefined,
      },
      trades: trades,  // No need to filter trades again since we did it in the query
    }
  } catch (error) {
    console.error('Error getting shared trades:', error)
    throw error
  }
}

export async function getUserShared(userId: string) {
  const prisma = new PrismaClient()
  try {
    const sharedTrades = await prisma.shared.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return sharedTrades
  } catch (error) {
    console.error('Error getting user shared trades:', error)
    throw error
  }
}

export async function deleteShared(slug: string, userId: string) {
  const prisma = new PrismaClient()
  try {
    const shared = await prisma.shared.findUnique({
      where: { slug },
    })

    if (!shared || shared.userId !== userId) {
      throw new Error('Unauthorized')
    }

    await prisma.shared.delete({
      where: { slug },
    })

    revalidatePath('/shared/[slug]', 'page')
  } catch (error) {
    console.error('Error deleting shared:', error)
    throw error
  }
}

// Helper function to generate a unique slug
function generateSlug(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
} 