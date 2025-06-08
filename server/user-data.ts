'use server'

import { getShared } from './shared'
import { TickDetails, User, Tag, DashboardLayout, FinancialEvent, Mood, Trade, Subscription } from '@prisma/client'
import { GroupWithAccounts } from './groups'
import { getCurrentLocale } from '@/locales/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from './auth'
import { Account, Group } from '@/context/data-provider'
import { revalidateTag, unstable_cache } from 'next/cache'

export type SharedDataResponse = {
  trades: Trade[]
  params: any
  error?: string
  groups: GroupWithAccounts[]
}

export async function loadSharedData(slug: string): Promise<SharedDataResponse> {
  if (!slug) {
    return {
      trades: [],
      params: null,
      error: 'Invalid slug',
      groups: []
    }
  }

  try {
    const sharedData = await getShared(slug)
    if (!sharedData) {
      return {
        trades: [],
        params: null,
        error: 'Shared data not found',
        groups: []
      }
    }

    return {
      trades: sharedData.trades,
      params: sharedData.params,
      groups: []
    }
  } catch (error) {
    return {
      trades: [],
      params: null,
      error: 'Failed to load shared data',
      groups: []
    }
  }
} 


export async function getUserData({noCache = false}: {noCache?: boolean} = {}): Promise<{
  userData: User | null;
  subscription: Subscription | null;
  tickDetails: TickDetails[];
  tags: Tag[];
  accounts: Account[];
  groups: Group[];
  financialEvents: FinancialEvent[];
  moodHistory: Mood[];
}> {
  const userId = await getUserId()
  const locale = await getCurrentLocale()

  if (noCache) {
    console.log(`[Cache MISS] Revalidating user data for user ${userId}`)
    revalidateTag(`user-data-${userId}-${locale}`)
  }

  return unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching user data for user ${userId}`)
      
      // Run all independent queries in parallel for better performance
      const [
        userData,
        subscription,
        tickDetails,
        tags,
        accounts,
        groups,
        financialEvents,
        moodHistory
      ] = await Promise.all([
        prisma.user.findUnique({
          where: {
            id: userId
          }
        }),
        prisma.subscription.findUnique({
          where: {
            userId: userId
          }
        }),
        prisma.tickDetails.findMany(),
        prisma.tag.findMany({
          where: {
            userId: userId
          }
        }),
        prisma.account.findMany({
          where: {
            userId: userId
          },
          include: {
            payouts: true,
            group: true
          }
        }),
        prisma.group.findMany({
          where: {
            userId: userId
          },
          include: {
            accounts: true
          }
        }),
        prisma.financialEvent.findMany({
          where: {
            lang: locale
          }
        }),
        prisma.mood.findMany({
          where: {
            userId: userId
          }
        })
      ])

      return { userData, subscription, tickDetails, tags, accounts, groups, financialEvents, moodHistory }
    },
    [`user-data-${userId}-${locale}`],
    {
      tags: [`user-data-${userId}-${locale}`],
      revalidate: 86400 // 24 hours in seconds
    }
  )()
}

export async function getDashboardLayout(userId: string): Promise<DashboardLayout | null> {
  console.log('getDashboardLayout')
  return await prisma.dashboardLayout.findUnique({
    where: {
      userId: userId
    }
  })
}