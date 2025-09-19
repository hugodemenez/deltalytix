'use server'

import { getShared } from './shared'
import { TickDetails, User, Tag, DashboardLayout, FinancialEvent, Mood, Trade, Subscription } from '@prisma/client'
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
    console.log(`[getUserData] Force refresh - bypassing cache for user ${userId}`)
    revalidateTag(`user-data-${userId}`)
    
    const [userData, subscription, tickDetails, accounts, groups] = await Promise.all([
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
      })
    ])

    const core = { userData, subscription, tickDetails, accounts, groups }
    
    // Fetch non-cached, potentially large/volatile datasets
    const [tags, financialEvents, moodHistory] = await Promise.all([
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
      accounts: core.accounts,
      groups: core.groups,
      financialEvents,
      moodHistory
    }
  }

  // Cache only lightweight, stable core data. Heavy/volatile data is fetched outside cache.
  const getCachedCoreUserData = unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching core user data for user ${userId}`)

      const [userData, subscription, tickDetails, accounts, groups] = await Promise.all([
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
        })
      ])

      return { userData, subscription, tickDetails, accounts, groups }
    },
    [`user-data-${userId}-${locale}`],
    {
      tags: [`user-data-${userId}-${locale}`, `user-data-${userId}`],
      revalidate: 86400 // 24 hours in seconds
    }
  )

  const core = await getCachedCoreUserData()

  // Fetch non-cached, potentially large/volatile datasets
  const [tags, financialEvents, moodHistory] = await Promise.all([
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
    accounts: core.accounts,
    groups: core.groups,
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
  revalidateTag(`user-data-${userId}`)
}