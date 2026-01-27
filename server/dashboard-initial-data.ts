'use cache'

import { cacheTag, cacheLife } from 'next/cache'
import { Trade, User, Subscription, Tag, TickDetails, FinancialEvent, Mood, DashboardLayout, Account as PrismaAccount, Payout as PrismaPayout, Group as PrismaGroup } from '@/prisma/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserId } from './auth'
import { getCurrentLocale } from '@/locales/server'
import { getSubscriptionDetails } from './subscription'
import { startOfDay } from 'date-fns'
import { Widget, WidgetType, WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'

// Re-define types here to avoid circular dependency with data-provider
export interface Account extends Omit<PrismaAccount, 'payouts' | 'group'> {
  payouts?: PrismaPayout[]
  group?: PrismaGroup | null
}

export interface Group extends PrismaGroup {
  accounts: PrismaAccount[]
}

export type DashboardLayoutWithWidgets = {
  id: string
  userId: string
  desktop: Widget[]
  mobile: Widget[]
  createdAt: Date
  updatedAt: Date
}

// Default layouts for new users
export const serverDefaultLayouts: DashboardLayoutWithWidgets = {
  id: '',
  userId: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  desktop: [
    { i: 'widget1751403095730', type: 'calendarWidget' as WidgetType, size: 'large' as WidgetSize, x: 0, y: 17, w: 6, h: 8 },
    { i: 'widget1751715494609', type: 'tradeDistribution' as WidgetType, size: 'small' as WidgetSize, x: 0, y: 1, w: 3, h: 4 },
    { i: 'widget1751741589330', type: 'pnlChart' as WidgetType, size: 'medium' as WidgetSize, x: 6, y: 9, w: 6, h: 4 },
    { i: 'widget1752135357688', type: 'weekdayPnlChart' as WidgetType, size: 'small' as WidgetSize, x: 3, y: 5, w: 3, h: 4 },
    { i: 'widget1752135359621', type: 'timeOfDayChart' as WidgetType, size: 'small' as WidgetSize, x: 6, y: 13, w: 3, h: 4 },
    { i: 'widget1752135361015', type: 'timeInPositionChart' as WidgetType, size: 'small' as WidgetSize, x: 9, y: 13, w: 3, h: 4 },
    { i: 'widget1752135363430', type: 'equityChart' as WidgetType, size: 'large' as WidgetSize, x: 6, y: 1, w: 6, h: 8 },
    { i: 'widget1752135365730', type: 'pnlBySideChart' as WidgetType, size: 'small' as WidgetSize, x: 9, y: 17, w: 3, h: 4 },
    { i: 'widget1752135368429', type: 'tickDistribution' as WidgetType, size: 'medium' as WidgetSize, x: 6, y: 21, w: 6, h: 4 },
    { i: 'widget1752135370579', type: 'commissionsPnl' as WidgetType, size: 'small' as WidgetSize, x: 3, y: 1, w: 3, h: 4 },
    { i: 'widget1752135378584', type: 'timeRangePerformance' as WidgetType, size: 'small' as WidgetSize, x: 0, y: 5, w: 3, h: 4 },
    { i: 'widget1752135395916', type: 'riskRewardRatio' as WidgetType, size: 'tiny' as WidgetSize, x: 9, y: 0, w: 3, h: 1 },
    { i: 'widget1752135396857', type: 'statisticsWidget' as WidgetType, size: 'medium' as WidgetSize, x: 0, y: 13, w: 6, h: 4 },
    { i: 'widget1752135397611', type: 'profitFactor' as WidgetType, size: 'tiny' as WidgetSize, x: 6, y: 0, w: 3, h: 1 },
    { i: 'widget1762369988555', type: 'averagePositionTime' as WidgetType, size: 'tiny' as WidgetSize, x: 3, y: 0, w: 3, h: 1 },
    { i: 'widget1762369989742', type: 'cumulativePnl' as WidgetType, size: 'tiny' as WidgetSize, x: 0, y: 0, w: 3, h: 1 },
    { i: 'widget1762520220168', type: 'pnlPerContractChart' as WidgetType, size: 'small' as WidgetSize, x: 6, y: 17, w: 3, h: 4 },
    { i: 'widget1762520253990', type: 'pnlPerContractDailyChart' as WidgetType, size: 'medium' as WidgetSize, x: 0, y: 9, w: 6, h: 4 },
  ],
  mobile: [
    { i: 'calendarWidget', type: 'calendarWidget' as WidgetType, size: 'large' as WidgetSize, x: 0, y: 2, w: 12, h: 6 },
    { i: 'equityChart', type: 'equityChart' as WidgetType, size: 'medium' as WidgetSize, x: 0, y: 8, w: 12, h: 6 },
    { i: 'cumulativePnl', type: 'cumulativePnl' as WidgetType, size: 'tiny' as WidgetSize, x: 0, y: 0, w: 12, h: 1 },
    { i: 'tradePerformance', type: 'tradePerformance' as WidgetType, size: 'tiny' as WidgetSize, x: 0, y: 1, w: 12, h: 1 },
  ],
}

// Types for initial data
export interface DashboardInitialData {
  userId: string
  locale: string
  trades: Trade[]
  userData: User | null
  subscription: Subscription | null
  tickDetails: TickDetails[]
  tags: Tag[]
  accounts: Account[]
  groups: Group[]
  financialEvents: FinancialEvent[]
  moodHistory: Mood[]
  dashboardLayout: DashboardLayoutWithWidgets
}

/**
 * Fetches all dashboard initial data in a single cached call.
 * Uses Next.js 16 'use cache' with tag-based invalidation.
 * 
 * The data is cached per-user and can be invalidated using:
 * - `updateTag('dashboard-${userId}')` for full refresh
 * - `updateTag('trades-${userId}')` for trades only
 * - `updateTag('user-data-${userId}')` for user data only
 */
export async function getDashboardInitialData(): Promise<DashboardInitialData | null> {
  // Get userId via middleware header fast-path
  const userId = await getUserId()
  const locale = await getCurrentLocale()
  
  if (!userId) {
    return null
  }

  // Apply cache tags for granular invalidation
  cacheTag(`dashboard-${userId}`)
  cacheTag(`trades-${userId}`)
  cacheTag(`user-data-${userId}`)
  cacheTag(`dashboard-layout-${userId}`)
  
  // Cache life: 1 hour for dashboard data
  // This will be invalidated on mutations via updateTag()
  cacheLife('hours')

  // Check subscription status for trade filtering
  const subscriptionDetails = await getSubscriptionDetails()
  const isSubscribed = subscriptionDetails?.isActive || false

  // Build trades query with subscription-based filtering
  const tradesQuery: Parameters<typeof prisma.trade.findMany>[0] = {
    where: { userId },
    orderBy: { entryDate: 'desc' as const }
  }

  if (!isSubscribed) {
    const twoWeeksAgo = startOfDay(new Date())
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    tradesQuery.where = {
      ...tradesQuery.where,
      entryDate: { gte: twoWeeksAgo.toISOString() }
    }
  }

  // Fetch all data in parallel for optimal performance
  const [
    trades,
    userData,
    subscription,
    tickDetails,
    accounts,
    groups,
    tags,
    financialEvents,
    moodHistory,
    dashboardLayoutRaw
  ] = await Promise.all([
    // Trades
    prisma.trade.findMany(tradesQuery),
    // User data
    prisma.user.findUnique({ where: { id: userId } }),
    // Subscription
    prisma.subscription.findUnique({ where: { userId } }),
    // Tick details (global, not user-specific)
    prisma.tickDetails.findMany(),
    // Accounts with payouts and group
    prisma.account.findMany({
      where: { userId },
      include: {
        payouts: true,
        group: true
      }
    }),
    // Groups with accounts
    prisma.group.findMany({
      where: { userId },
      include: { accounts: true }
    }),
    // Tags
    prisma.tag.findMany({ where: { userId } }),
    // Financial events by locale
    prisma.financialEvent.findMany({ where: { lang: locale } }),
    // Mood history
    prisma.mood.findMany({ where: { userId } }),
    // Dashboard layout
    prisma.dashboardLayout.findUnique({ where: { userId } })
  ])

  // Process trades to ensure ISO string format
  const processedTrades = trades.map(trade => ({
    ...trade,
    entryDate: new Date(trade.entryDate).toISOString(),
    exitDate: trade.closeDate ? new Date(trade.closeDate).toISOString() : null
  }))

  // Parse dashboard layout or use defaults
  let dashboardLayout: DashboardLayoutWithWidgets
  if (dashboardLayoutRaw) {
    const parseJsonSafely = (jsonString: unknown): Widget[] => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : []
      } catch {
        return []
      }
    }

    dashboardLayout = {
      id: dashboardLayoutRaw.id,
      userId: dashboardLayoutRaw.userId,
      desktop: parseJsonSafely(dashboardLayoutRaw.desktop),
      mobile: parseJsonSafely(dashboardLayoutRaw.mobile),
      createdAt: dashboardLayoutRaw.createdAt,
      updatedAt: dashboardLayoutRaw.updatedAt
    }
  } else {
    // Use default layouts if none exists
    dashboardLayout = {
      ...serverDefaultLayouts,
      id: '',
      userId
    }
  }

  console.log(`[getDashboardInitialData] Fetched data for user ${userId}: ${processedTrades.length} trades, ${accounts.length} accounts`)

  return {
    userId,
    locale,
    trades: processedTrades as Trade[],
    userData,
    subscription,
    tickDetails,
    tags,
    accounts: accounts as Account[],
    groups: groups as Group[],
    financialEvents,
    moodHistory,
    dashboardLayout
  }
}
