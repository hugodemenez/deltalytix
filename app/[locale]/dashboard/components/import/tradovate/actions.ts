'use server'

import { createClient } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { Trade, TickDetails } from '@prisma/client'
import crypto from 'crypto'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'
import { getTickDetails } from '@/server/tick-details'

// Helper function to format dates in the required format: 2025-06-05T08:38:40+00:00
function formatDateForAPI(date: Date): string {
  return date.toISOString().replace('Z', '+00:00')
}

// Helper function to ensure timestamps are in the correct format
function formatTimestamp(timestamp: string): string {
  // If the timestamp already has the correct format, return it
  if (timestamp.includes('+00:00')) {
    return timestamp
  }
  // If it ends with 'Z', convert to +00:00 format
  if (timestamp.endsWith('Z')) {
    return timestamp.replace('Z', '+00:00')
  }
  // If it's a valid ISO string, convert it
  try {
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return formatDateForAPI(date)
    }
  } catch (error) {
    console.warn('Failed to parse timestamp:', timestamp, error)
  }
  // Return as-is if we can't parse it
  return timestamp
}

// Helper function to format duration in a readable format (e.g., "1min 34sec")
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}sec`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds === 0) {
    return `${minutes}min`
  }
  
  return `${minutes}min ${remainingSeconds}sec`
}

// Environment variables for Tradovate OAuth
const TRADOVATE_CLIENT_ID = process.env.TRADOVATE_CLIENT_ID
const TRADOVATE_CLIENT_SECRET = process.env.TRADOVATE_CLIENT_SECRET
const TRADOVATE_REDIRECT_URI = process.env.TRADOVATE_REDIRECT_URI

// Debug mode configuration - enabled in development or when explicitly set
const DEBUG_MODE = process.env.NODE_ENV === 'development' || process.env.TRADOVATE_DEBUG === 'true'

// Logger utility for conditional logging
const logger = {
  debug: (message: string, data?: any) => {
    if (DEBUG_MODE) {
      console.log(`[TRADOVATE-DEBUG] ${message}`, data)
    }
  },
  info: (message: string, data?: any) => {
    console.log(`[TRADOVATE] ${message}`, data)
  },
  warn: (message: string, error?: any) => {
    console.warn(`[TRADOVATE] ${message}`, error)
  },
  error: (message: string, error?: any) => {
    console.error(`[TRADOVATE] ${message}`, error)
  }
}


// Environment URLs - demo only
const TRADOVATE_ENVIRONMENTS = {
  demo: {
    auth: 'https://trader.tradovate.com', // OAuth authorization
    api: 'https://demo.tradovateapi.com'   // API calls
  }
}

interface TradovateAccount {
  id: number
  name: string
  nickname: string
  accountType: string
  active: boolean
  clearingHouse: string
  riskCategoryId: number
  autoLiqProfileId: number
  marginCalculationType: string
  legalStatus: string
  nickname2?: string
}

interface TradovateTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface TradovateOAuthResult {
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  error?: string
  authUrl?: string
  state?: string
}

interface TradovateAccountsResult {
  accounts?: TradovateAccount[]
  error?: string
}


// Tradovate Contract data structure
interface TradovateContract {
  id: number
  name: string
  symbol: string
  description?: string
}

// Tradovate Fill Fee data structure
interface TradovateFillFee {
  id: number
  clearingFee: number
  clearingCurrencyId: number
  exchangeFee: number
  exchangeCurrencyId: number
  nfaFee: number
  nfaCurrencyId: number
  brokerageFee: number
  brokerageCurrencyId: number
  commission: number
  commissionCurrencyId: number
  orderRoutingFee: number
  orderRoutingCurrencyId: number
}

// Tradovate Fill Pair data structure (from fillPair/list endpoint)
interface TradovateFillPair {
  id: number
  positionId: number
  buyFillId: number
  sellFillId: number
  qty: number
  buyPrice: number
  sellPrice: number
  active: boolean
}

// Combined fill data with details and commission
interface Fill {
  details: any
  commission: number
}


interface TradovateTradesResult {
  processedTrades?: Trade[]
  savedCount?: number
  ordersCount?: number
  error?: string
}

// Helper function to fetch contract details
async function getContractById(accessToken: string, contractId: number): Promise<TradovateContract | null> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ id: String(contractId) }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/contract/item?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch contract ${contractId}:`, response.status, response.statusText)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.warn(`Error fetching contract ${contractId}:`, error)
    return null
  }
}

// Helper function to fetch multiple fill fees by IDs in batch
async function getFillFeesByIds(accessToken: string, fillIds: number[]): Promise<TradovateFillFee[]> {
  try {
    if (fillIds.length === 0) return []
    
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ ids: fillIds.join(',') }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/fillFee/items?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to fetch fill fees batch:`, { status: response.status, statusText: response.statusText })
      return []
    }
    
    const fees = await response.json()
    return Array.isArray(fees) ? fees : []
  } catch (error) {
    logger.warn(`Error fetching fill fees batch:`, error)
    return []
  }
}

// Helper function to fetch fill fees (kept for backward compatibility)
async function getFillFeeById(accessToken: string, fillId: number): Promise<TradovateFillFee | null> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ id: String(fillId) }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/fillFee/item?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to fetch fill fee ${fillId}:`, { status: response.status, statusText: response.statusText })
      return null
    }
    
    return await response.json()
  } catch (error) {
    logger.warn(`Error fetching fill fee ${fillId}:`, error)
    return null
  }
}

// Helper function to fetch fill pairs
async function getFillPairs(accessToken: string): Promise<TradovateFillPair[]> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const response = await fetch(`${apiBaseUrl}/v1/fillPair/list`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch fill pairs:`, response.status, response.statusText)
      return []
    }
    
    const fillPairs = await response.json()
    return Array.isArray(fillPairs) ? fillPairs : []
  } catch (error) {
    console.warn(`Error fetching fill pairs:`, error)
    return []
  }
}

// Helper function to fetch multiple fills by IDs in batch
async function getFillsByIds(accessToken: string, fillIds: number[]): Promise<any[]> {
  try {
    if (fillIds.length === 0) return []
    
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ ids: fillIds.join(',') }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/fill/items?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to fetch fills batch:`, { status: response.status, statusText: response.statusText })
      return []
    }
    
    const fills = await response.json()
    return Array.isArray(fills) ? fills : []
  } catch (error) {
    logger.warn(`Error fetching fills batch:`, error)
    return []
  }
}

// Helper function to fetch individual fill details (kept for backward compatibility)
async function getFillById(accessToken: string, fillId: number): Promise<any | null> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ id: String(fillId) }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/fill/item?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to fetch fill ${fillId}:`, { status: response.status, statusText: response.statusText })
      return null
    }
    
    return await response.json()
  } catch (error) {
    logger.warn(`Error fetching fill ${fillId}:`, error)
    return null
  }
}

// Helper function to fetch multiple orders by IDs in batch
async function getOrdersByIds(accessToken: string, orderIds: number[]): Promise<any[]> {
  try {
    if (orderIds.length === 0) return []
    
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ ids: orderIds.join(',') }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/order/items?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to fetch orders batch:`, { status: response.status, statusText: response.statusText })
      return []
    }
    
    const orders = await response.json()
    return Array.isArray(orders) ? orders : []
  } catch (error) {
    logger.warn(`Error fetching orders batch:`, error)
    return []
  }
}

// Helper function to fetch order details by orderId (kept for backward compatibility)
async function getOrderById(accessToken: string, orderId: number): Promise<any | null> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const params = new URLSearchParams({ id: String(orderId) }).toString()
    const response = await fetch(`${apiBaseUrl}/v1/order/item?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to fetch order ${orderId}:`, { status: response.status, statusText: response.statusText })
      return null
    }
    
    return await response.json()
  } catch (error) {
    logger.warn(`Error fetching order ${orderId}:`, error)
    return null
  }
}


export async function initiateTradovateOAuth(): Promise<TradovateOAuthResult> {
  try {
    console.log('Initiating Tradovate OAuth (demo only)...')
    console.log('Environment variables check:', {
      hasClientId: !!TRADOVATE_CLIENT_ID,
      hasRedirectUri: !!TRADOVATE_REDIRECT_URI,
      clientId: TRADOVATE_CLIENT_ID, // This is safe to log for debugging
      redirectUri: TRADOVATE_REDIRECT_URI
    })

    if (!TRADOVATE_CLIENT_ID || !TRADOVATE_REDIRECT_URI) {
      console.error('Missing environment variables:', {
        TRADOVATE_CLIENT_ID: !!TRADOVATE_CLIENT_ID,
        TRADOVATE_REDIRECT_URI: !!TRADOVATE_REDIRECT_URI
      })
      return { error: 'Tradovate OAuth credentials not configured' }
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex')
    console.log('Generated OAuth state:', state.substring(0, 8) + '...')
    
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('User authentication failed:', { authError, hasUser: !!user })
      return { error: 'User not authenticated' }
    }

    console.log('User authenticated:', { userId: user.id })

    // Build OAuth URL using demo environment
    const authBaseUrl = TRADOVATE_ENVIRONMENTS.demo.auth
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    console.log('Using auth URL:', authBaseUrl)
    console.log('Using API URL:', apiBaseUrl)
    
    const authUrl = new URL(`${authBaseUrl}/oauth`)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('client_id', TRADOVATE_CLIENT_ID)
    authUrl.searchParams.append('redirect_uri', TRADOVATE_REDIRECT_URI)
    authUrl.searchParams.append('scope', 'read write')
    authUrl.searchParams.append('state', state)

    console.log('Generated OAuth URL:', authUrl.toString())

    return { authUrl: authUrl.toString(), state }
  } catch (error) {
    console.error('Failed to initiate Tradovate OAuth:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error
    })
    return { error: 'Failed to initiate OAuth flow' }
  }
}

export async function handleTradovateCallback(code: string, state: string): Promise<TradovateOAuthResult> {
  try {
    console.log('Processing Tradovate OAuth callback (demo only):', { 
      hasCode: !!code, 
      hasState: !!state,
      state: state?.substring(0, 8) + '...'
    })

    // Validate environment variables first
    if (!TRADOVATE_CLIENT_ID || !TRADOVATE_CLIENT_SECRET || !TRADOVATE_REDIRECT_URI) {
      console.error('Missing Tradovate OAuth environment variables:', {
        hasClientId: !!TRADOVATE_CLIENT_ID,
        hasClientSecret: !!TRADOVATE_CLIENT_SECRET,
        hasRedirectUri: !!TRADOVATE_REDIRECT_URI
      })
      return { error: 'Tradovate OAuth credentials not configured' }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('User authentication failed in callback:', { authError, hasUser: !!user })
      return { error: 'User not authenticated' }
    }

    // Exchange code for tokens using demo environment
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    console.log('Exchanging code for tokens:', { apiBaseUrl, userId: user.id })
    
    const tokenResponse = await fetch(`${apiBaseUrl}/auth/oauthtoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TRADOVATE_CLIENT_ID}:${TRADOVATE_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: TRADOVATE_REDIRECT_URI,
        client_id: TRADOVATE_CLIENT_ID
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
        url: tokenResponse.url
      })
      return { error: `Failed to exchange code for tokens: ${tokenResponse.status} ${tokenResponse.statusText}` }
    }

    let tokens: TradovateTokenResponse
    try {
      tokens = await tokenResponse.json()
    } catch (parseError) {
      console.error('Failed to parse token response:', parseError)
      return { error: 'Invalid response format from Tradovate' }
    }

    console.log('Token exchange response:', { 
      hasAccessToken: !!tokens?.access_token,
      hasRefreshToken: !!tokens?.refresh_token,
      expiresIn: tokens?.expires_in,
      scope: tokens?.scope,
      fullResponse: tokens
    })
    
    // Validate the token response structure
    if (!tokens || typeof tokens !== 'object') {
      console.error('Invalid token response structure:', tokens)
      return { error: 'Invalid token response structure from Tradovate' }
    }

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
      console.error('Missing required token fields:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        hasExpiresIn: !!tokens.expires_in,
        tokens
      })
      return { error: 'Invalid token response from Tradovate - missing required fields' }
    }
    
    // Calculate expiration time
    const expiresAt = formatDateForAPI(new Date(Date.now() + (tokens.expires_in * 1000)))
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt
    }
  } catch (error) {
    console.error('Failed to handle OAuth callback:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error
    })
    return { error: `Failed to process OAuth callback: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function refreshTradovateToken(refreshToken: string): Promise<TradovateOAuthResult> {
  try {
    if (!TRADOVATE_CLIENT_ID || !TRADOVATE_CLIENT_SECRET) {
      return { error: 'Tradovate OAuth credentials not configured' }
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    const tokenResponse = await fetch(`${apiBaseUrl}/auth/oauthtoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TRADOVATE_CLIENT_ID}:${TRADOVATE_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: TRADOVATE_CLIENT_ID
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token refresh failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorText,
        url: tokenResponse.url
      })
      return { error: `Failed to refresh token: ${tokenResponse.status} ${tokenResponse.statusText}` }
    }

    let tokens: TradovateTokenResponse
    try {
      tokens = await tokenResponse.json()
    } catch (parseError) {
      console.error('Failed to parse refresh token response:', parseError)
      return { error: 'Invalid response format from Tradovate' }
    }

    // Validate the token response structure
    if (!tokens || typeof tokens !== 'object') {
      console.error('Invalid refresh token response structure:', tokens)
      return { error: 'Invalid refresh token response structure from Tradovate' }
    }

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
      console.error('Missing required fields in refresh token response:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        hasExpiresIn: !!tokens.expires_in,
        tokens
      })
      return { error: 'Invalid refresh token response from Tradovate - missing required fields' }
    }
    
    // Calculate expiration time
    const expiresAt = formatDateForAPI(new Date(Date.now() + (tokens.expires_in * 1000)))
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt
    }
  } catch (error) {
    console.error('Failed to refresh Tradovate token:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error
    })
    return { error: `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Test authentication with demo user list endpoint
export async function testTradovateAuth(accessToken: string) {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    console.log('Testing Tradovate authentication with demo user list endpoint')
    
    const response = await fetch(`${apiBaseUrl}/v1/user/list`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('User list endpoint response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (response.ok) {
      const userData = await response.json()
      console.log('User data from demo user list:', userData)
      return { success: true, userData }
    } else {
      const errorText = await response.text()
      console.error('Demo user list endpoint failed:', { status: response.status, errorText })
      return { success: false, error: errorText }
    }
  } catch (error) {
    console.error('Error testing auth:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getTradovateAccounts(accessToken: string): Promise<TradovateAccountsResult> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api
    console.log('Fetching Tradovate accounts (demo only):', { 
      apiBaseUrl,
      hasToken: !!accessToken,
      tokenPrefix: accessToken?.substring(0, 10) + '...'
    })
    
    // Use simple account list endpoint that we validated works
    const response = await fetch(`${apiBaseUrl}/v1/account/list`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Account list response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch accounts:', { status: response.status, errorText })
      return { error: `Failed to fetch accounts: ${errorText}` }
    }

    const accounts = await response.json()
    console.log('Received accounts from Tradovate:', { 
      accountCount: accounts.length,
      sampleAccount: accounts[0]
    })
    
    if (!Array.isArray(accounts) || accounts.length === 0) {
      console.log('No accounts returned from Tradovate')
      return { error: 'No accounts found on demo environment' }
    }

    console.log('Final accounts result:', {
      isArray: Array.isArray(accounts),
      length: accounts.length,
      accounts: accounts
    })
    
    return { accounts }
  } catch (error) {
    console.error('Failed to get Tradovate accounts:', error)
    return { error: 'Failed to get accounts' }
  }
}

// Process fill pairs into trades with proper P&L calculation
async function buildTradesFromFillPairs(
  fillPairs: TradovateFillPair[],
  contracts: Map<number, TradovateContract>,
  fillsById: Map<number, Fill>,
  ordersById: Map<number, any>,
  accountsById: Map<number, TradovateAccount>,
  userId: string,
  tickDetails: TickDetails[]
): Promise<Trade[]> {
  logger.info(`Building trades from ${fillPairs.length} fill pairs for user ${userId}`)

  const trades: Trade[] = []

  for (const fillPair of fillPairs) {
    try {
        // Get detailed fill information from pre-fetched data
        const buyFillData = fillsById.get(fillPair.buyFillId)
        const sellFillData = fillsById.get(fillPair.sellFillId)

      if (!buyFillData || !sellFillData) {
        logger.warn(`Missing fill details for pair ${fillPair.id}:`, { buyFill: !!buyFillData, sellFill: !!sellFillData })
        continue
      }

      const buyFill = buyFillData.details
      const sellFill = sellFillData.details

      // Get order details to determine account (we only have sell order details)
      const sellOrder = ordersById.get(sellFill.orderId)

      if (!sellOrder) {
        logger.warn(`Missing sell order details for pair ${fillPair.id}`)
        continue
      }

      // Since we only fetch sell order details, use that for account ID
      // Both fills should be from the same account anyway
      const accountId = sellOrder.accountId

      // Get account details
      const account = accountsById.get(accountId)
      if (!account) {
        logger.warn(`Account not found for ID ${accountId} in fill pair ${fillPair.id}`)
        continue
      }

      const accountLabel = account.name || account.nickname || accountId.toString()

      // Get contract information
      const contract = contracts.get(buyFill.contractId)
      if (!contract) {
        logger.warn(`Contract not found for fill pair ${fillPair.id}:`, buyFill.contractId)
        continue
      }

      // Extract symbol from contract
      const rawCode = (contract.symbol || contract.name || '').toUpperCase()
      let contractSymbol = 'Unknown'
      const monthCodeMatch = rawCode.match(/^([A-Z]+?)[FGHJKMNQUVXZ][0-9]+$/i)
      if (monthCodeMatch) {
        contractSymbol = monthCodeMatch[1].toUpperCase()
      } else if (rawCode) {
        const lettersOnly = rawCode.replace(/[^A-Z]/g, '')
        contractSymbol = lettersOnly.slice(0, 2) || 'Unknown'
      }

      // Determine side based on which fill happened first (entry vs exit)
      const buyTime = new Date(buyFill.timestamp)
      const sellTime = new Date(sellFill.timestamp)
      const isBuyFirst = buyTime < sellTime
      
      // If buy happened first, it's a long trade (buy then sell)
      // If sell happened first, it's a short trade (sell then buy)
      const side = isBuyFirst ? 'Long' : 'Short'
      
      // Calculate P&L using tick value (more accurate for futures)
      const tickDetail = tickDetails.find(detail => detail.ticker === contractSymbol)
      const tickSize = tickDetail?.tickSize || 0.25 // Default tick size for MES
      const tickValue = tickDetail?.tickValue || 5.0 // Default tick value for MES
      
      // Determine entry and exit prices based on trade direction
      const entryPrice = isBuyFirst ? fillPair.buyPrice : fillPair.sellPrice
      const exitPrice = isBuyFirst ? fillPair.sellPrice : fillPair.buyPrice
      const entryTime = isBuyFirst ? buyTime : sellTime
      const exitTime = isBuyFirst ? sellTime : buyTime
      
      // Calculate price difference (exit - entry)
      const priceDifference = exitPrice - entryPrice
      const ticks = priceDifference / tickSize
      let pnl = ticks * tickValue * fillPair.qty
      
      // For short trades, we need to reverse the P&L calculation
      // Short: sell first (entry), buy later (exit) = profit when exit price < entry price
      if (!isBuyFirst) {
        pnl = -pnl // Reverse for short trades
      }
      
      logger.debug(`P&L calculation for ${contractSymbol}`, {
        isBuyFirst,
        side: isBuyFirst ? 'Long' : 'Short',
        entryPrice,
        exitPrice,
        priceDifference,
        tickSize,
        tickValue,
        ticks,
        quantity: fillPair.qty,
        pnl
      })

      // Calculate duration in seconds (exit time - entry time)
      const durationSeconds = Math.max(0, Math.round((exitTime.getTime() - entryTime.getTime()) / 1000))

      // Get commission for both fills, adjusted for quantity differences
      // Fee is per fill, but we need to calculate based on fill pair quantity
      const buyFillQty = buyFill.qty || 1
      const sellFillQty = sellFill.qty || 1
      
      // Calculate fee per unit for each fill, then multiply by fill pair quantity
      const buyCommissionPerUnit = buyFillData.commission / buyFillQty
      const sellCommissionPerUnit = sellFillData.commission / sellFillQty
      
      // Apply the fill pair quantity to get the correct commission
      const buyCommission = buyCommissionPerUnit * fillPair.qty
      const sellCommission = sellCommissionPerUnit * fillPair.qty
      const totalCommission = Number((buyCommission + sellCommission).toFixed(2))
      
      logger.debug(`Commission calculation for ${contractSymbol}`, {
        buyFillQty,
        sellFillQty,
        fillPairQty: fillPair.qty,
        buyCommissionPerUnit,
        sellCommissionPerUnit,
        buyCommission,
        sellCommission,
        totalCommission
      })

      // P&L is already calculated correctly with tick value
      const netPnl = pnl

      const tradeData = {
        accountNumber: accountLabel,
        entryId: isBuyFirst ? `fill_${fillPair.buyFillId}` : `fill_${fillPair.sellFillId}`,
        closeId: isBuyFirst ? `fill_${fillPair.sellFillId}` : `fill_${fillPair.buyFillId}`,
        instrument: contractSymbol,
        entryPrice: entryPrice.toString(),
        closePrice: exitPrice.toString(),
        entryDate: formatTimestamp(entryTime.toISOString()),
        closeDate: formatTimestamp(exitTime.toISOString()),
        quantity: fillPair.qty,
        side: side,
        userId: userId
      }

      const trade: Trade = {
        id: generateDeterministicTradeId(tradeData),
        accountNumber: accountLabel,
        quantity: fillPair.qty,
        entryId: isBuyFirst ? `fill_${fillPair.buyFillId}` : `fill_${fillPair.sellFillId}`,
        closeId: isBuyFirst ? `fill_${fillPair.sellFillId}` : `fill_${fillPair.buyFillId}`,
        instrument: contractSymbol,
        entryPrice: entryPrice.toString(),
        closePrice: exitPrice.toString(),
        entryDate: formatTimestamp(entryTime.toISOString()),
        closeDate: formatTimestamp(exitTime.toISOString()),
        pnl: netPnl,
        timeInPosition: durationSeconds,
        userId: userId,
        side: side,
        commission: totalCommission,
        createdAt: new Date(),
        comment: ``,
        videoUrl: null,
        tags: ['tradovate'],
        imageBase64: null,
        imageBase64Second: null,
        groupId: null
      }

      trades.push(trade)
      logger.debug(`Created trade for ${contractSymbol}: ${side} ${fillPair.qty} @ ${entryPrice} -> ${exitPrice} = $${netPnl.toFixed(2)} (${formatDuration(durationSeconds)}) [Commission: $${totalCommission.toFixed(2)}]`)

    } catch (error) {
      logger.error(`Error processing fill pair ${fillPair.id}:`, error)
    }
  }

  logger.info(`Built ${trades.length} trades from ${fillPairs.length} fill pairs`)
  return trades
}


export async function getTradovateTrades(accessToken: string): Promise<TradovateTradesResult> {
  try {
    logger.info('Fetching Tradovate fill pairs for improved trade building (demo only)')
    
    // Get current user for userId
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api

    // Fetch fill pairs which are trades
    logger.info('Fetching fill pairs...')
    const fillPairs = await getFillPairs(accessToken)
    logger.info(`Received ${fillPairs.length} fill pairs from Tradovate`)
    
    // Means there are no trades to import
    if (fillPairs.length === 0) {
      logger.info('No fill pairs returned from Tradovate')
      return { processedTrades: [], savedCount: 0, ordersCount: 0 }
    }

    // Fetch all accounts to map account IDs to account details
    logger.info('Fetching accounts for account resolution...')
    const accountsRes = await fetch(`${apiBaseUrl}/v1/account/list`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    const accounts: TradovateAccount[] = accountsRes.ok ? await accountsRes.json() : []
    const accountsById = new Map<number, TradovateAccount>()
    accounts.forEach(account => accountsById.set(account.id, account))
    logger.info(`Fetched ${accounts.length} accounts for resolution`)

    // Step 1: Collect all unique fill IDs from fill pairs
    const allFillIds = new Set<number>()
    fillPairs.forEach(pair => {
      allFillIds.add(pair.buyFillId)
      allFillIds.add(pair.sellFillId)
    })
    
    logger.info(`Collecting ${allFillIds.size} unique fill IDs from ${fillPairs.length} fill pairs`)

    // Step 2: Fetch all fills and fees in parallel batches
    const [allFills, allFees] = await Promise.all([
      getFillsByIds(accessToken, Array.from(allFillIds)),
      getFillFeesByIds(accessToken, Array.from(allFillIds))
    ])

    logger.info(`Fetched ${allFills.length} fills and ${allFees.length} fees in batch`)

    // Step 3: Create maps for quick lookup and collect unique IDs
    const fillsById = new Map<number, Fill>()
    const feesById = new Map<number, TradovateFillFee>()
    const uniqueContractIds = new Set<number>()
    const uniqueOrderIds = new Set<number>()

    // Map fills by ID
    allFills.forEach(fill => {
      fillsById.set(fill.id, { details: fill, commission: 0 })
      uniqueContractIds.add(fill.contractId)
      uniqueOrderIds.add(fill.orderId)
    })

    // Map fees by ID and update fill commissions
    allFees.forEach(fee => {
      feesById.set(fee.id, fee)
      const fill = fillsById.get(fee.id)
      if (fill) {
        fill.commission = Number(fee.commission || 0)
      }
    })

    logger.info(`Found ${uniqueContractIds.size} unique contract IDs and ${uniqueOrderIds.size} unique order IDs`)

    // Step 4: Fetch contract details in parallel batch
    const contracts = new Map<number, TradovateContract>()
    const contractPromises = Array.from(uniqueContractIds).map(async (contractId) => {
      try {
        const contract = await getContractById(accessToken, contractId)
        if (contract) {
          contracts.set(contractId, contract)
          logger.debug(`Contract ${contractId}: ${contract.name} (${contract.symbol})`)
        }
      } catch (error) {
        logger.warn(`Failed to fetch contract ${contractId}:`, error)
      }
    })
    await Promise.all(contractPromises)

    // Step 5: Optimize - only fetch sell order details for account resolution
    // Since both buy and sell orders are from the same account, we only need sell orders
    const sellOrderIds = new Set<number>()
    fillPairs.forEach(pair => {
      const sellFill = fillsById.get(pair.sellFillId)
      if (sellFill) {
        sellOrderIds.add(sellFill.details.orderId)
      }
    })

    logger.info(`Fetching ${sellOrderIds.size} sell order details for account resolution`)

    // Fetch only sell order details in batch
    const sellOrders = await getOrdersByIds(accessToken, Array.from(sellOrderIds))
    const ordersById = new Map<number, any>()
    sellOrders.forEach(order => {
      ordersById.set(order.id, order)
      logger.debug(`Order ${order.id}: accountId=${order.accountId}`)
    })

    // Fetch tick details for P&L calculation
    logger.info('Fetching tick details for P&L calculation...')
    const tickDetails = await getTickDetails()
    logger.info(`Fetched ${tickDetails.length} tick details`)

    // Build trades using fill pairs with account resolution
    const processedTrades = await buildTradesFromFillPairs(fillPairs, contracts, fillsById, ordersById, accountsById, user.id, tickDetails)
    
    if (processedTrades.length === 0) {
      logger.info('No trades could be created from fill pairs')
      return { processedTrades: [], savedCount: 0 }
    }

    // Save trades to database
    logger.info(`Attempting to save ${processedTrades.length} fill pair trades to database`)
    const saveResult = await saveTradesAction(processedTrades)
    
    if (saveResult.error) {
      logger.error('Failed to save trades:', { error: saveResult.error, details: saveResult.details })
      return { 
        error: `Failed to save trades: ${saveResult.error}`,
        processedTrades: processedTrades,
        ordersCount: fillPairs.length * 2
      }
    }

    logger.info(`Successfully saved ${saveResult.numberOfTradesAdded} fill pair trades`)
    
    return { 
      processedTrades: processedTrades,
      savedCount: saveResult.numberOfTradesAdded,
      ordersCount: fillPairs.length * 2
    }
  } catch (error) {
    logger.error('Failed to get Tradovate trades:', error)
    return { error: 'Failed to get trades' }
  }
}


 