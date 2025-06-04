'use server'

import { getShared } from './shared'
import { TickDetails, User, Tag, DashboardLayout, FinancialEvent, Mood, Trade, Subscription } from '@prisma/client'
import { GroupWithAccounts } from './groups'
import { getCurrentLocale } from '@/locales/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from './auth'
import { Account, Group } from '@/context/data-provider'

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

export async function getUserData(): Promise<{
  userData: User | null;
  subscription: Subscription | null;
  tickDetails: TickDetails[];
  tags: Tag[];
  accounts: Account[];
  groups: Group[];
  financialEvents: FinancialEvent[];
  moodHistory: Mood[];
}> {
  console.log('getUserData')
  const userId = await getUserId()
  const locale = await getCurrentLocale()
  return await prisma.$transaction(async (tx) => {
    const userData = await tx.user.findUnique({
      where: {
        id: userId
      }
    })
    const subscription = await tx.subscription.findUnique({
      where: {
        userId: userId
      }
    })
    const tickDetails = await tx.tickDetails.findMany()
    const tags = await tx.tag.findMany({
      where: {
        userId: userId
      }
    })
    const accounts = await tx.account.findMany({
      where: {
        userId: userId
      },
      include: {
        payouts: true,
        group: true
      }
    })
    const groups = await tx.group.findMany({
      where: {
        userId: userId
      },
      include: {
        accounts: true
      }
    })
    const financialEvents = await tx.financialEvent.findMany({
      where: {
        lang: locale
      }
    })
    const moodHistory = await tx.mood.findMany({
      where: {
        userId: userId
      }
    })
    return { userData, subscription, tickDetails, tags, accounts, groups, financialEvents, moodHistory }
  })
}

export async function getDashboardLayout(userId: string): Promise<DashboardLayout | null> {
  console.log('getDashboardLayout')
  return await prisma.dashboardLayout.findUnique({
    where: {
      userId: userId
    }
  })
}