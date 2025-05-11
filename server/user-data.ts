'use server'

import { createClient } from './auth'
import { getSubscriptionDetails } from './subscription'
import { getTrades, loadDashboardLayout } from './database'
import { getTickDetails } from './tick-details'
import { getShared } from './shared'
import { Tag, Trade, Group } from '@prisma/client'
import { WidgetType, WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import { getTags } from './tags'
import { getOnboardingStatus } from './onboarding'
import { getPropFirmAccounts } from '@/app/[locale]/(dashboard)/dashboard/data/actions'
import type { FinancialEvent, Mood, Account as PropFirmAccount } from '@prisma/client'
import { getEtpToken } from './etp'
import { getGroups, GroupWithAccounts } from './groups'
import { getFinancialEvents } from './financial-events'
import { getMoodHistory } from './mood'

// Update the interface declarations to export them
export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  type: WidgetType
  size: WidgetSize
}

export interface Layouts {
  desktop: LayoutItem[]
  mobile: LayoutItem[]
}

interface TickDetail {
  ticker: string
  tickValue: number
}

export type InitialDataResponse = {
  user: any | null
  isFirstConnection: boolean
  etpToken: string | null
  subscription: {
    isActive: boolean
    plan: string | null
    status: string
    endDate: Date | null
    trialEndsAt: Date | null
  } | null
  trades: Trade[]
  tickDetails: Record<string, number>
  layouts: Layouts | null
  error?: string
  tags: Tag[]
  propfirmAccounts: PropFirmAccount[]
  groups: GroupWithAccounts[]
  financialEvents: FinancialEvent[]
  moodHistory: Mood[]
}

export type SharedDataResponse = {
  trades: Trade[]
  params: any
  error?: string
  groups: GroupWithAccounts[]
}

export async function loadInitialData(email?: string): Promise<InitialDataResponse> {
  try {
    // Create a new client for each request
    const supabase = await createClient()
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[loadInitialData] Session error:', sessionError)
      return {
        user: null,
        isFirstConnection: false,
        etpToken: null,
        subscription: null,
        trades: [],
        tickDetails: {},
        layouts: null,
        tags: [],
        propfirmAccounts: [],
        groups: [],
        financialEvents: [],
        moodHistory: [],
        error: 'Session not found'
      }
    }

    if (!session) {
      console.log('[loadInitialData] No session found')
      return {
        user: null,
        isFirstConnection: false,
        etpToken: null,
        subscription: null,
        trades: [],
        tickDetails: {},
        layouts: null,
        tags: [],
        propfirmAccounts: [],
        groups: [],
        financialEvents: [],
        moodHistory: [],
        error: 'No active session'
      }
    }

    // Now get the user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('[loadInitialData] Auth error:', userError)
      return {
        user: null,
        isFirstConnection: false,
        etpToken: null,
        subscription: null,
        trades: [],
        tickDetails: {},
        layouts: null,
        tags: [],
        propfirmAccounts: [],
        groups: [],
        financialEvents: [],
        moodHistory: [],
        error: 'Authentication failed'
      }
    }

    if (!user) {
      console.log('[loadInitialData] No user found')
      return {
        user: null,
        isFirstConnection: false,
        etpToken: null,
        subscription: null,
        trades: [],
        tickDetails: {},
        layouts: null,
        tags: [],
        propfirmAccounts: [],
        groups: [],
        financialEvents: [],
        moodHistory: [],
        error: 'User not found'
      }
    }


    // Get user onboarding status and ETP token
    const [isFirstConnection, etpTokenData] = await Promise.all([
      getOnboardingStatus(),
      getEtpToken()
    ])

    // Get subscription details first
    const subscription = await getSubscriptionDetails(user.email || email || '')

    // Run remaining operations concurrently with subscription status
    const [tradesResult, tickDetailsResult, layoutsResult, tagsResult, propfirmAccountsResult, groupsResult, financialEventsResult, moodHistoryResult] = await Promise.all([
      getTrades(user.id, subscription?.isActive ?? false).catch(() => []),
      getTickDetails().catch(() => []),
      loadDashboardLayout(user.id).catch(() => null),
      getTags(user.id).catch(() => []),
      getPropFirmAccounts(user.id).catch(() => []),
      getGroups(user.id).catch(() => []),
      getFinancialEvents().catch(() => []),
      getMoodHistory(user.id).catch(() => [])
    ])

    const tickDetails = tickDetailsResult.reduce((acc: Record<string, number>, detail: TickDetail) => {
      acc[detail.ticker] = detail.tickValue
      return acc
    }, {})

    // Ensure layouts result is properly typed
    const layouts = layoutsResult as Layouts | null

    return {
      user,
      isFirstConnection,
      etpToken: etpTokenData.token || null,
      subscription,
      trades: tradesResult,
      tickDetails,
      layouts,
      tags: tagsResult,
      propfirmAccounts: propfirmAccountsResult as PropFirmAccount[],
      groups: groupsResult,
      financialEvents: financialEventsResult,
      moodHistory: moodHistoryResult
    }
  } catch (error) {
    return {
      user: null,
      isFirstConnection: false,
      etpToken: null,
      subscription: null,
      trades: [],
      tickDetails: {},
      layouts: null,
      tags: [],
      propfirmAccounts: [],
      groups: [],
      financialEvents: [],
      moodHistory: [],
      error: 'Failed to load initial data'
    }
  }
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