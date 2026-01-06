'use server'

import { getShared } from './shared'
import { TickDetails, User, Tag, DashboardLayout, FinancialEvent, Mood, Trade, Subscription } from '@/prisma/generated/prisma/client'
import { GroupWithAccounts } from './groups'
import { getCurrentLocale } from '@/locales/server'
import { prisma } from '@/lib/prisma'
import { createClient, getUserId } from './auth'
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


export async function getUserData(forceRefresh: boolean = false): Promise<{
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

  // If forceRefresh is true, bypass cache and fetch directly
  if (forceRefresh) {
    const start = performance.now();
    console.log(`[getUserData] Force refresh - bypassing cache for user ${userId}`)
    revalidateTag(`user-data-${userId}`, { expire: 0 })
    
    // Fetch all data in a single transaction
    const [userData, subscription, tickDetails, accounts, groups, tags, financialEvents, moodHistory] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: userId }
      }),
      prisma.subscription.findUnique({
        where: { userId: userId }
      }),
      prisma.tickDetails.findMany(),
      prisma.account.findMany({
        where: { userId: userId },
        include: {
          payouts: true,
          group: true
        }
      }),
      prisma.group.findMany({
        where: { userId: userId },
        include: { accounts: true }
      }),
      prisma.tag.findMany({
        where: { userId: userId }
      }),
      prisma.financialEvent.findMany({
        where: { lang: locale }
      }),
      prisma.mood.findMany({
        where: { userId: userId }
      })
    ])

    console.log(`[getUserData] Force refresh completed in ${(performance.now() - start).toFixed(2)}ms`)

    return {
      userData,
      subscription,
      tickDetails,
      tags,
      accounts,
      groups,
      financialEvents,
      moodHistory
    }
  }

  // Cache only lightweight, stable core data. Heavy/volatile data is fetched outside cache.
  const getCachedCoreUserData = unstable_cache(
    async () => {
      const start = performance.now();
      console.log(`[Cache MISS] Fetching core user data for user ${userId}`)

      // Cache only lightweight, stable data
      const [userData, subscription, tickDetails] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId }
        }),
        prisma.subscription.findUnique({
          where: { userId: userId }
        }),
        prisma.tickDetails.findMany()
      ])

      console.log(`[getUserData] Core data fetch completed in ${(performance.now() - start).toFixed(2)}ms`)
      return { userData, subscription, tickDetails }
    },
    [`user-data-${userId}-${locale}`],
    {
      tags: [`user-data-${userId}-${locale}`, `user-data-${userId}`],
      revalidate: 86400 // 24 hours in seconds
    }
  )

  const core = await getCachedCoreUserData()

  // Fetch large/volatile data in a single transaction (not cached)
  const [accounts, groups, tags, financialEvents, moodHistory] = await prisma.$transaction([
    prisma.account.findMany({
      where: { userId: userId },
      include: {
        payouts: true,
        group: true
      }
    }),
    prisma.group.findMany({
      where: { userId: userId },
      include: { accounts: true }
    }),
    prisma.tag.findMany({
      where: { userId: userId }
    }),
    prisma.financialEvent.findMany({
      where: { lang: locale }
    }),
    prisma.mood.findMany({
      where: { userId: userId }
    })
  ])

  return {
    userData: core.userData,
    subscription: core.subscription,
    tickDetails: core.tickDetails,
    tags,
    accounts,
    groups,
    financialEvents,
    moodHistory
  }
}

export async function getDashboardLayout(userId: string): Promise<DashboardLayout | null> {
  console.log('getDashboardLayout')
  return await prisma.dashboardLayout.findUnique({
    where: {
      userId: userId
    }
  })
}

export async function updateIsFirstConnectionAction(isFirstConnection: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return 0
  }
  await prisma.user.update({
    where: { id: userId },
    data: { isFirstConnection }
  })
  revalidateTag(`user-data-${userId}`, { expire: 0 })
}