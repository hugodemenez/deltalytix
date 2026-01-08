'use server'

import { Trade, Prisma, PrismaClient, Group, TickDetails } from '@/prisma/generated/prisma/client'
import { endOfDay, startOfDay } from 'date-fns'
import { parseISO, isValid } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { GroupWithAccounts } from './groups'

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
  tickDetails?: TickDetails[]
}

interface DateRange {
  from: string;
  to?: string;
}

export async function createShared(data: SharedParams): Promise<string> {
  try {
    // Validate date range
    if (!data.dateRange?.from) {
      throw new Error('Start date is required')
    }


    // Generate a unique slug
    let slug = generateSlug()
    let attempts = 0
    const maxAttempts = 5

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
  } finally {
    await prisma.$disconnect()
  }
}

export async function getShared(slug: string): Promise<{params: SharedParams, trades: Trade[], groups: GroupWithAccounts[]} | null> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const shared = await tx.shared.findUnique({
        where: { slug },
      })

      if (!shared) {
        return null
      }

      // Update view count
      await tx.shared.update({
        where: { slug },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      })

      // Parse the date range
      const dateRange = shared.dateRange as unknown as DateRange
      if (!dateRange?.from) {
        throw new Error('Invalid date range: from date is required')
      }
      const fromDate = new Date(dateRange.from)
      const toDate = dateRange.to ? new Date(dateRange.to) : undefined

      // Parallel fetch of trades, tick details, and groups
      const [trades, tickDetails, groups] = await Promise.all([
        tx.trade.findMany({
          where: {
            userId: shared.userId,
            ...(shared.accountNumbers.length > 0 && {
              accountNumber: {
                in: shared.accountNumbers,
              },
            }),
            entryDate: {
              gte: fromDate.toISOString(),
              ...(toDate && { lte: toDate.toISOString() })
            }
          },
          orderBy: {
            entryDate: 'desc',
          },
        }),
        tx.tickDetails.findMany(),
        tx.group.findMany({
          where: {
            userId: shared.userId,
          },
          include: {
            accounts: true,
          },
        })
      ])

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
          tickDetails,
        },
        trades,
        groups,
      }
    })

    return result
  } catch (error) {
    console.error('[getShared] Error:', error)
    return null
  }
}

export async function getUserShared(userId: string) {
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