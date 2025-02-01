'use server'

import { createClient } from './auth'
import { getSubscriptionDetails } from './subscription'
import { getTrades, loadDashboardLayout } from './database'
import { getTickDetails } from './tick-details'
import { getShared } from './shared'
import { Trade } from '@prisma/client'
import { WidgetType, WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'

// Initialize supabase client at module level
let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;

// Function to ensure we have an initialized client
async function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = await createClient()
  }
  return supabaseClient
}

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
}

export type SharedDataResponse = {
  trades: Trade[]
  params: any
  error?: string
}

export async function loadInitialData(email?: string): Promise<InitialDataResponse> {
  console.log('[loadInitialData] Starting data load', { email })
  try {
    const supabase = await getSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('[loadInitialData] Auth error:', userError)
      return {
        user: null,
        subscription: null,
        trades: [],
        tickDetails: {},
        layouts: null,
        error: 'Authentication failed'
      }
    }

    if (!user) {
      console.log('[loadInitialData] No user found')
      return {
        user: null,
        subscription: null,
        trades: [],
        tickDetails: {},
        layouts: null,
        error: 'User not found'
      }
    }

    console.log('[loadInitialData] User found', { userId: user.id })

    // Get subscription details first
    console.log('[loadInitialData] Fetching subscription details')
    const subscription = await getSubscriptionDetails(user.email || email || '')

    // Run remaining operations concurrently with subscription status
    const [tradesResult, tickDetailsResult, layoutsResult] = await Promise.all([
      getTrades(user.id, subscription?.isActive ?? false).catch(() => []),
      getTickDetails().catch(() => []),
      loadDashboardLayout(user.id).catch(() => null)
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
      hasLayouts: !!layouts
    })

    return {
      user,
      subscription,
      trades: tradesResult,
      tickDetails,
      layouts
    }
  } catch (error) {
    console.error('[loadInitialData] Error loading initial data:', error)
    return {
      user: null,
      subscription: null,
      trades: [],
      tickDetails: {},
      layouts: null,
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
      error: 'Invalid slug'
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
        error: 'Shared data not found'
      }
    }

    console.log('[loadSharedData] Data load complete', { 
      tradesCount: sharedData.trades.length,
      hasParams: !!sharedData.params 
    })

    return {
      trades: sharedData.trades,
      params: sharedData.params
    }
  } catch (error) {
    console.error('[loadSharedData] Error loading shared data:', error)
    return {
      trades: [],
      params: null,
      error: 'Failed to load shared data'
    }
  }
} 