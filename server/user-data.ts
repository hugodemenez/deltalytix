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
import type { Account as PropFirmAccount } from '@prisma/client'
import { getEtpToken } from './etp'
import { getGroups, GroupWithAccounts } from './groups'

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
}

export type SharedDataResponse = {
  trades: Trade[]
  params: any
  error?: string
  groups: GroupWithAccounts[]
}

export async function loadInitialData(email?: string): Promise<InitialDataResponse> {
  console.log('[loadInitialData] Starting data load', { email })
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
        error: 'User not found'
      }
    }

    console.log('[loadInitialData] User found', { userId: user.id })

    // Get user onboarding status and ETP token
    const [isFirstConnection, etpTokenData] = await Promise.all([
      getOnboardingStatus(),
      getEtpToken()
    ])

    // Get subscription details first
    console.log('[loadInitialData] Fetching subscription details')
    const subscription = await getSubscriptionDetails(user.email || email || '')

    // Run remaining operations concurrently with subscription status
    const [tradesResult, tickDetailsResult, layoutsResult, tagsResult, propfirmAccountsResult, groupsResult] = await Promise.all([
      getTrades(user.id, subscription?.isActive ?? false).catch(() => []),
      getTickDetails().catch(() => []),
      loadDashboardLayout(user.id).catch(() => null),
      getTags(user.id).catch(() => []),
      getPropFirmAccounts(user.id).catch(() => []),
      getGroups(user.id).catch(() => [])
    ])

    console.log('[loadInitialData] Processing tick details', { tickCount: tickDetailsResult.length })
    const tickDetails = tickDetailsResult.reduce((acc: Record<string, number>, detail: TickDetail) => {
      acc[detail.ticker] = detail.tickValue
      return acc
    }, {})

    // Ensure layouts result is properly typed
    const layouts = layoutsResult as Layouts | null

    console.log('[loadInitialData] Data load complete', { 
      tradesCount: tradesResult.length,
      tickDetailsCount: Object.keys(tickDetails).length,
      hasSubscription: !!subscription,
      hasLayouts: !!layouts,
      propfirmAccountsCount: propfirmAccountsResult.length,
      groupsCount: groupsResult.length
    })

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
      groups: groupsResult
    }
  } catch (error) {
    console.error('[loadInitialData] Error loading initial data:', error)
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
      error: 'Failed to load initial data'
    }
  }
}

export async function loadSharedData(slug: string): Promise<SharedDataResponse> {
  if (!slug) {
    console.error('[loadSharedData] No slug provided')
    return {
      trades: [],
      params: null,
      error: 'Invalid slug',
      groups: []
    }
  }

  console.log('[loadSharedData] Starting shared data load', { slug })
  try {
    const sharedData = await getShared(slug)
    if (!sharedData) {
      console.log('[loadSharedData] No shared data found for slug')
      return {
        trades: [],
        params: null,
        error: 'Shared data not found',
        groups: []
      }
    }

    console.log('[loadSharedData] Data load complete', { 
      tradesCount: sharedData.trades.length,
      hasParams: !!sharedData.params 
    })

    return {
      trades: sharedData.trades,
      params: sharedData.params,
      groups: []
    }
  } catch (error) {
    console.error('[loadSharedData] Error loading shared data:', error)
    return {
      trades: [],
      params: null,
      error: 'Failed to load shared data',
      groups: []
    }
  }
} 