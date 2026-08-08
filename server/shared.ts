'use server'

import { Trade, Prisma, PrismaClient, Group, TickDetails } from '@/prisma/generated/prisma/client'
import { endOfDay, startOfDay } from 'date-fns'
import { parseISO, isValid } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getUserId } from './auth'
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

// Every export here is a server action, so each argument is caller-supplied.
// A share exposes the owner's trades to anyone holding the slug, which is why the
// owner is read from the session rather than taken as a parameter.
export async function createShared(
  data: Omit<SharedParams, 'userId'>,
): Promise<string> {
  try {
    const userId = await getUserId()

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
            userId,
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
    // Note: these reads are intentionally not wrapped in an interactive
    // transaction. The heavy queries (trades and the full tickDetails table)
    // can exceed the default 5s transaction timeout (P2028), and a public
    // read-only view does not require cross-query snapshot isolation.
    const shared = await prisma.shared.findUnique({
      where: { slug },
    })

    if (!shared) {
      return null
    }

    // Parse the date range
    const dateRange = shared.dateRange as unknown as DateRange
    if (!dateRange?.from) {
      throw new Error('Invalid date range: from date is required')
    }
    const fromDate = new Date(dateRange.from)
    const toDate = dateRange.to ? new Date(dateRange.to) : undefined

    // Parallel fetch of trades, tick details, and groups
    const [trades, tickDetails, groups] = await Promise.all([
      prisma.trade.findMany({
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
      prisma.tickDetails.findMany(),
      prisma.group.findMany({
        where: {
          userId: shared.userId,
        },
        include: {
          accounts: true,
        },
      })
    ])

    // Increment the view count without blocking the response or failing the
    // fetch if it errors out.
    prisma.shared.update({
      where: { slug },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    }).catch((error) => {
      console.error('[getShared] Failed to increment view count:', error)
    })

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
  } catch (error) {
    console.error('[getShared] Error:', error)
    return null
  }
}

export async function getUserShared() {
  try {
    const userId = await getUserId()

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

export async function deleteShared(slug: string) {
  try {
    const userId = await getUserId()

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

export async function updateSharedAccountNumbers(slug: string, accountNumbers: string[]) {
  try {
    const userId = await getUserId()

    const shared = await prisma.shared.findUnique({
      where: { slug },
    })

    if (!shared || shared.userId !== userId) {
      throw new Error('Unauthorized')
    }

    const normalizedAccountNumbers = Array.from(
      new Set(accountNumbers.map(account => account.trim()).filter(Boolean))
    )

    const updatedShared = await prisma.shared.update({
      where: { slug },
      data: {
        accountNumbers: normalizedAccountNumbers,
      },
    })

    revalidatePath('/shared/[slug]', 'page')
    return updatedShared
  } catch (error) {
    console.error('Error updating shared account numbers:', error)
    throw error
  }
}

// The slug is the only thing standing between a visitor and the owner's trades,
// so it is drawn from a CSPRNG: Math.random's state is recoverable from a handful
// of observed outputs, which would make other users' slugs predictable.
function generateSlug(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(chars.length))
  }
  return result
} 