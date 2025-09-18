'use server'

import { createClient } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { Trade } from '@prisma/client'
import crypto from 'crypto'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'

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

// Environment variables for Tradovate OAuth
const TRADOVATE_CLIENT_ID = process.env.TRADOVATE_CLIENT_ID
const TRADOVATE_CLIENT_SECRET = process.env.TRADOVATE_CLIENT_SECRET
const TRADOVATE_REDIRECT_URI = process.env.TRADOVATE_REDIRECT_URI


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

// Tradovate Fill data structure (based on API docs)
interface TradovateFill {
  id: number
  orderId: number
  contractId: number
  timestamp: string
  tradeDate: string
  action: 'Buy' | 'Sell'
  fillType: string
  qty: number
  price: number
  active: boolean
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

// FIFO position tracking
interface FIFOPosition {
  contractId: number
  contractName: string
  contractSymbol: string
  quantity: number
  averagePrice: number
  totalValue: number
  fills: Array<{
    fillId: number
    qty: number
    price: number
    timestamp: string
    fee: number
  }>
}

interface TradovateTradesResult {
  trades?: TradovateFill[]
  processedTrades?: Trade[]
  savedCount?: number
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

// Helper function to fetch fill fees
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
      console.warn(`Failed to fetch fill fee ${fillId}:`, response.status, response.statusText)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.warn(`Error fetching fill fee ${fillId}:`, error)
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

// FIFO algorithm to build trades from fills
function buildTradesFromFills(
  fills: TradovateFill[],
  contracts: Map<number, TradovateContract>,
  fillCommissionById: Map<number, number>,
  accountLabel: string,
  userId: string
): Trade[] {
  console.log('Building trades from fills using FIFO algorithm:', { fillCount: fills.length, accountLabel, userId })

  const trades: Trade[] = []
  const positions = new Map<number, FIFOPosition>() // contractId -> position

  // Sort fills by timestamp to ensure proper FIFO order
  const sortedFills = fills.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  for (const fill of sortedFills) {
    const contract = contracts.get(fill.contractId)
    const contractName = contract?.name || `Contract_${fill.contractId}`
    // Derive base symbol from symbol or name (e.g., "ES" from "ESZ5")
    const rawCode = (contract?.symbol || contract?.name || '').toUpperCase()
    let contractSymbol = 'Unknown'
    const monthCodeMatch = rawCode.match(/^([A-Z]+?)[FGHJKMNQUVXZ][0-9]+$/i)
    if (monthCodeMatch) {
      contractSymbol = monthCodeMatch[1].toUpperCase()
    } else if (rawCode) {
      const lettersOnly = rawCode.replace(/[^A-Z]/g, '')
      contractSymbol = lettersOnly.slice(0, 2) || 'Unknown'
    }

    // Get or create position for this contract
    let position = positions.get(fill.contractId)
    if (!position) {
      position = {
        contractId: fill.contractId,
        contractName,
        contractSymbol,
        quantity: 0,
        averagePrice: 0,
        totalValue: 0,
        fills: []
      }
      positions.set(fill.contractId, position)
    }

    // Add fill to position
    const fillData = {
      fillId: fill.id,
      qty: fill.action === 'Buy' ? fill.qty : -fill.qty, // Negative for sells
      price: fill.price,
      timestamp: formatTimestamp(fill.timestamp),
      fee: Math.abs(fillCommissionById.get(fill.id) || 0)
    }
    position.fills.push(fillData)

    // Update position quantities
    const oldQuantity = position.quantity
    const newQuantity = oldQuantity + fillData.qty
    const fillValue = fillData.qty * fillData.price

    if (oldQuantity === 0) {
      // First fill for this contract
      position.quantity = newQuantity
      position.averagePrice = fillData.price
      position.totalValue = fillValue
    } else if (oldQuantity > 0 && newQuantity > 0) {
      // Adding to long position
      position.quantity = newQuantity
      position.totalValue += fillValue
      position.averagePrice = position.totalValue / position.quantity
    } else if (oldQuantity > 0 && newQuantity <= 0) {
      // Closing long position (and possibly opening short)
      const closeQuantity = Math.min(oldQuantity, Math.abs(fillData.qty))
      const remainingQuantity = oldQuantity - closeQuantity
      
      // Create trade for the closed portion
      const entryValue = closeQuantity * position.averagePrice
      const exitValue = closeQuantity * fillData.price
      const pnl = exitValue - entryValue
      
      // Commission allocation: proportional share of entry fees + proportional share of this exit fill fee
      const totalEntryFees = position.fills
        .filter(f => f.fillId !== fillData.fillId)
        .reduce((sum, f) => sum + Math.abs(f.fee), 0)
      const entryFeeShare = oldQuantity > 0 ? (totalEntryFees * (closeQuantity / oldQuantity)) : 0
      const exitFeeShare = Math.abs(fillData.fee) * Math.min(1, closeQuantity / Math.abs(fillData.qty))
      const totalCommission = Number((entryFeeShare + exitFeeShare).toFixed(2))

      const tradeData = {
        accountNumber: accountLabel,
        entryId: `fill_${position.fills[0].fillId}`, // First fill in position
        closeId: `fill_${fillData.fillId}`,
        instrument: contractSymbol,
        entryPrice: position.averagePrice.toString(),
        closePrice: fillData.price.toString(),
        entryDate: position.fills[0].timestamp,
        closeDate: fillData.timestamp,
        quantity: closeQuantity,
        side: 'Long',
        userId: userId
      }

      const trade: Trade = {
        id: generateDeterministicTradeId(tradeData),
        accountNumber: accountLabel,
        quantity: closeQuantity,
        entryId: `fill_${position.fills[0].fillId}`, // First fill in position
        closeId: `fill_${fillData.fillId}`,
        instrument: contractSymbol,
        entryPrice: position.averagePrice.toString(),
        closePrice: fillData.price.toString(),
        entryDate: position.fills[0].timestamp,
        closeDate: fillData.timestamp,
        pnl: pnl,
        timeInPosition: Math.max(0, Math.round((new Date(fillData.timestamp).getTime() - new Date(position.fills[0].timestamp).getTime()) / 1000)),
        userId: userId,
        side: 'Long',
        commission: totalCommission,
        createdAt: new Date(),
        comment: `Tradovate FIFO trade - ${contractSymbol}`,
        videoUrl: null,
        tags: ['tradovate-sync', 'fifo'],
        imageBase64: null,
        imageBase64Second: null,
        groupId: null
      }
      
      trades.push(trade)
      
      // Update position for remaining quantity
      if (remainingQuantity > 0) {
        position.quantity = remainingQuantity
        position.totalValue = remainingQuantity * position.averagePrice
      } else {
        // Position closed, reset for potential short position
        position.quantity = Math.abs(newQuantity)
        position.averagePrice = fillData.price
        position.totalValue = Math.abs(newQuantity) * fillData.price
        position.fills = [fillData] // Reset fills for new position
      }
    } else if (oldQuantity < 0 && newQuantity < 0) {
      // Adding to short position
      position.quantity = newQuantity
      position.totalValue += fillValue
      position.averagePrice = position.totalValue / position.quantity
    } else if (oldQuantity < 0 && newQuantity >= 0) {
      // Closing short position (and possibly opening long)
      const closeQuantity = Math.min(Math.abs(oldQuantity), Math.abs(fillData.qty))
      const remainingQuantity = Math.abs(oldQuantity) - closeQuantity
      
      // Create trade for the closed portion
      const entryValue = closeQuantity * position.averagePrice
      const exitValue = closeQuantity * fillData.price
      const pnl = entryValue - exitValue // Reversed for short
      
      // Commission allocation for short: proportional share of entry (short entry sells) + proportional share of exit buy fee
      const totalEntryFeesShort = position.fills
        .filter(f => f.fillId !== fillData.fillId)
        .reduce((sum, f) => sum + Math.abs(f.fee), 0)
      const entryFeeShareShort = Math.abs(oldQuantity) > 0 ? (totalEntryFeesShort * (closeQuantity / Math.abs(oldQuantity))) : 0
      const exitFeeShareShort = Math.abs(fillData.fee) * Math.min(1, closeQuantity / Math.abs(fillData.qty))
      const totalCommissionShort = Number((entryFeeShareShort + exitFeeShareShort).toFixed(2))

      const tradeDataShort = {
        accountNumber: accountLabel,
        entryId: `fill_${position.fills[0].fillId}`, // First fill in position
        closeId: `fill_${fillData.fillId}`,
        instrument: contractSymbol,
        entryPrice: position.averagePrice.toString(),
        closePrice: fillData.price.toString(),
        entryDate: position.fills[0].timestamp,
        closeDate: fillData.timestamp,
        quantity: closeQuantity,
        side: 'Short',
        userId: userId
      }

      const trade: Trade = {
        id: generateDeterministicTradeId(tradeDataShort),
        accountNumber: accountLabel,
        quantity: closeQuantity,
        entryId: `fill_${position.fills[0].fillId}`, // First fill in position
        closeId: `fill_${fillData.fillId}`,
        instrument: contractSymbol,
        entryPrice: position.averagePrice.toString(),
        closePrice: fillData.price.toString(),
        entryDate: position.fills[0].timestamp,
        closeDate: fillData.timestamp,
        pnl: pnl,
        timeInPosition: Math.max(0, Math.round((new Date(fillData.timestamp).getTime() - new Date(position.fills[0].timestamp).getTime()) / 1000)),
        userId: userId,
        side: 'Short',
        commission: totalCommissionShort,
        createdAt: new Date(),
        comment: `Tradovate FIFO trade - ${contractSymbol}`,
        videoUrl: null,
        tags: ['tradovate-sync', 'fifo'],
        imageBase64: null,
        imageBase64Second: null,
        groupId: null
      }
      
      trades.push(trade)
      
      // Update position for remaining quantity
      if (remainingQuantity > 0) {
        position.quantity = -remainingQuantity
        position.totalValue = -remainingQuantity * position.averagePrice
      } else {
        // Position closed, reset for potential long position
        position.quantity = newQuantity
        position.averagePrice = fillData.price
        position.totalValue = newQuantity * fillData.price
        position.fills = [fillData] // Reset fills for new position
      }
    }
  }

  console.log(`Built ${trades.length} trades from ${fills.length} fills using FIFO algorithm`)
  return trades
}

export async function getTradovateTrades(accessToken: string, accountId: number): Promise<TradovateTradesResult> {
  try {
    console.log('Fetching Tradovate fills for FIFO trade building (demo only):', { accountId })
    
    // Get current user for userId
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    const apiBaseUrl = TRADOVATE_ENVIRONMENTS.demo.api

    // Fetch fills
    console.log('Fetching fills...')
    const fillsResponse = await fetch(`${apiBaseUrl}/v1/fill/list`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!fillsResponse.ok) {
      const errorText = await fillsResponse.text()
      console.error('Failed to fetch fills:', { status: fillsResponse.status, errorText })
      return { error: `Failed to fetch fills: ${errorText}` }
    }

    const fills: TradovateFill[] = await fillsResponse.json()
    console.log('Received fills from Tradovate:', { 
      fillCount: fills.length,
      sampleFill: fills[0]
    })
    
    if (!Array.isArray(fills) || fills.length === 0) {
      console.log('No fills returned from Tradovate')
      return { trades: [], processedTrades: [], savedCount: 0 }
    }

    // Resolve account label (name) from account list
    console.log('Resolving account name for accountId:', accountId)
    const accountsRes = await fetch(`${apiBaseUrl}/v1/account/list`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    const accounts: Array<{ id: number; name: string }> = accountsRes.ok ? await accountsRes.json() : []
    const account = accounts.find(a => a.id === accountId)
    const accountLabel = account?.name || accountId.toString()

    // Extract unique contract IDs and fetch contract details
    const uniqueContractIds = [...new Set(fills.map(fill => fill.contractId))]
    console.log(`Found ${uniqueContractIds.length} unique contract IDs:`, uniqueContractIds)

    const contracts = new Map<number, TradovateContract>()
    for (const contractId of uniqueContractIds) {
      try {
        console.log(`Fetching contract details for ID: ${contractId}`)
        const contract = await getContractById(accessToken, contractId)
        if (contract) {
          contracts.set(contractId, contract)
          console.log(`Contract ${contractId}: ${contract.name} (${contract.symbol})`)
        }
      } catch (error) {
        console.warn(`Failed to fetch contract ${contractId}:`, error)
      }
    }

    // Build fee map for fills (commission only)
    const fillCommissionById = new Map<number, number>()
    for (const f of fills) {
      try {
        const fee = await getFillFeeById(accessToken, f.id)
        if (fee) {
          const commission = Number(fee.commission || 0)
          fillCommissionById.set(f.id, commission)
        }
      } catch {}
    }

    // Build trades using FIFO algorithm
    const processedTrades = buildTradesFromFills(fills, contracts, fillCommissionById, accountLabel, user.id)
    
    if (processedTrades.length === 0) {
      console.log('No trades could be created from fills using FIFO algorithm')
      return { trades: [], processedTrades: [], savedCount: 0 }
    }

    // Save trades to database
    console.log(`Attempting to save ${processedTrades.length} FIFO trades to database`)
    const saveResult = await saveTradesAction(processedTrades)
    
    if (saveResult.error) {
      console.error('Failed to save trades:', saveResult.error, saveResult.details)
      return { 
        error: `Failed to save trades: ${saveResult.error}`,
        trades: [],
        processedTrades: processedTrades 
      }
    }

    console.log(`Successfully saved ${saveResult.numberOfTradesAdded} FIFO trades`)
    
    return { 
      trades: [],
      processedTrades: processedTrades,
      savedCount: saveResult.numberOfTradesAdded
    }
  } catch (error) {
    console.error('Failed to get Tradovate trades:', error)
    return { error: 'Failed to get trades' }
  }
}

 