'use server'

import { createClient } from '@/server/auth'
import { saveTradesAction } from '@/server/database'
import { Trade } from '@prisma/client'
import crypto from 'crypto'

// Environment variables for Tradovate OAuth
const TRADOVATE_CLIENT_ID = process.env.TRADOVATE_CLIENT_ID
const TRADOVATE_CLIENT_SECRET = process.env.TRADOVATE_CLIENT_SECRET
const TRADOVATE_REDIRECT_URI = process.env.TRADOVATE_REDIRECT_URI

// Environment URLs - based on official Tradovate OAuth example
const TRADOVATE_ENVIRONMENTS = {
  demo: {
    auth: 'https://trader.tradovate.com', // OAuth authorization (same for both)
    api: 'https://demo.tradovateapi.com'   // API calls
  },
  live: {
    auth: 'https://trader.tradovate.com', // OAuth authorization (same for both)
    api: 'https://live.tradovateapi.com'   // API calls
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

// Tradovate Fill/Execution data structure (based on API docs)
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
  instrument?: {
    name: string
    masterInstrument: {
      name: string
    }
  }
}

interface TradovateTradesResult {
  trades?: TradovateFill[]
  processedTrades?: Trade[]
  savedCount?: number
  error?: string
}

export async function initiateTradovateOAuth(environment: 'demo' | 'live' = 'demo'): Promise<TradovateOAuthResult> {
  try {
    console.log('Initiating Tradovate OAuth...', { environment })
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

    // Build OAuth URL using selected environment - based on official Tradovate example
    const authBaseUrl = TRADOVATE_ENVIRONMENTS[environment].auth
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS[environment].api
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
    console.error('Failed to initiate Tradovate OAuth:', error)
    return { error: 'Failed to initiate OAuth flow' }
  }
}

export async function handleTradovateCallback(code: string, state: string, environment: 'demo' | 'live' = 'demo'): Promise<TradovateOAuthResult> {
  try {
    console.log('Processing Tradovate OAuth callback:', { 
      hasCode: !!code, 
      hasState: !!state,
      state: state?.substring(0, 8) + '...',
      environment 
    })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('User authentication failed in callback:', { authError, hasUser: !!user })
      return { error: 'User not authenticated' }
    }

    // Exchange code for tokens using selected environment - based on official Tradovate example
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS[environment].api
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
        redirect_uri: TRADOVATE_REDIRECT_URI!,
        client_id: TRADOVATE_CLIENT_ID!
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return { error: 'Failed to exchange code for tokens' }
    }

    const tokens: TradovateTokenResponse = await tokenResponse.json()
    console.log('Token exchange response:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      fullResponse: tokens
    })
    
    // Validate the token response
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
      console.error('Invalid token response:', tokens)
      return { error: 'Invalid token response from Tradovate' }
    }
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt
    }
  } catch (error) {
    console.error('Failed to handle OAuth callback:', error)
    return { error: 'Failed to process OAuth callback' }
  }
}

export async function refreshTradovateToken(refreshToken: string, environment: 'demo' | 'live' = 'demo'): Promise<TradovateOAuthResult> {
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

    const apiBaseUrl = TRADOVATE_ENVIRONMENTS[environment].api
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
      console.error('Token refresh failed:', errorText)
      return { error: 'Failed to refresh token' }
    }

    const tokens: TradovateTokenResponse = await tokenResponse.json()
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt
    }
  } catch (error) {
    console.error('Failed to refresh Tradovate token:', error)
    return { error: 'Failed to refresh token' }
  }
}

// Test authentication with /me endpoint first
export async function testTradovateAuth(accessToken: string, environment: 'demo' | 'live' = 'demo') {
  try {
    // /me endpoint always uses live environment regardless of selected environment
    const liveApiBaseUrl = TRADOVATE_ENVIRONMENTS['live'].api
    console.log('Testing Tradovate authentication with /me endpoint (always on live)')
    
    const response = await fetch(`${liveApiBaseUrl}/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('/me endpoint response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (response.ok) {
      const userData = await response.json()
      console.log('User data from /me:', userData)
      return { success: true, userData }
    } else {
      const errorText = await response.text()
      console.error('/me endpoint failed:', { status: response.status, errorText })
      return { success: false, error: errorText }
    }
  } catch (error) {
    console.error('Error testing auth:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getTradovateAccounts(accessToken: string, environment: 'demo' | 'live' = 'demo'): Promise<TradovateAccountsResult> {
  try {
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS[environment].api
    console.log('Fetching Tradovate accounts:', { 
      apiBaseUrl, 
      environment,
      hasToken: !!accessToken,
      tokenPrefix: accessToken?.substring(0, 10) + '...'
    })
    
    // First, get user info again to see if it contains account references
    // Note: /me endpoint always uses live environment regardless of selected environment
    console.log('Getting user info first to check for account references...')
    const liveApiBaseUrl = TRADOVATE_ENVIRONMENTS['live'].api
    const userInfoResponse = await fetch(`${liveApiBaseUrl}/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json()
      console.log('User info for account discovery:', userInfo)
    } else {
      const errorText = await userInfoResponse.text()
      console.log('User info error:', { errorText })
    }
    
    // Try multiple account endpoints since prop firms often use different ones
    const accountEndpoints = [
      { name: 'Standard accounts', url: `${apiBaseUrl}/v1/account/list`, method: 'GET' },
      { name: 'Sim accounts find', url: `${apiBaseUrl}/v1/account/find`, method: 'POST', body: {} },
      { name: 'Demo accounts', url: `${apiBaseUrl}/v1/account/demo/list`, method: 'GET' },
      { name: 'User accounts', url: `${apiBaseUrl}/v1/user/accounts`, method: 'GET' },
      { name: 'Account search all', url: `${apiBaseUrl}/v1/account/search`, method: 'POST', body: { userSearchType: 'All' } },
      { name: 'Sim account list', url: `${apiBaseUrl}/v1/account/sim/list`, method: 'GET' },
      { name: 'Account deps', url: `${apiBaseUrl}/v1/account/deps`, method: 'GET' },
      { name: 'Account item', url: `${apiBaseUrl}/v1/account/item`, method: 'GET' },
      // Try with prop firm organization context
      { name: 'Organization accounts', url: `${apiBaseUrl}/v1/organization/accounts`, method: 'GET' },
      { name: 'User owned accounts', url: `${apiBaseUrl}/v1/user/ownedAccounts`, method: 'GET' }
    ]

    let accounts: any[] = []
    
    for (const endpoint of accountEndpoints) {
      try {
        console.log(`Trying ${endpoint.name} at ${endpoint.url}`)
        
        const requestOptions: RequestInit = {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
        
        if (endpoint.body) {
          requestOptions.body = JSON.stringify(endpoint.body)
        }
        
        const response = await fetch(endpoint.url, requestOptions)
        
        console.log(`${endpoint.name} response:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentLength: response.headers.get('content-length')
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`${endpoint.name} data:`, data)
          
          if (Array.isArray(data) && data.length > 0) {
            accounts = data
            console.log(`✅ Found ${data.length} accounts via ${endpoint.name}`)
            break
          } else if (data && !Array.isArray(data)) {
            // Single account object
            accounts = [data]
            console.log(`✅ Found 1 account via ${endpoint.name}`)
            break
          }
        }
      } catch (error) {
        console.log(`${endpoint.name} failed:`, error)
        continue
      }
    }

    // If no accounts found and we're on live, try demo environment for prop firm sim accounts
    if (accounts.length === 0 && environment === 'live') {
      console.log('No accounts found on live environment, trying demo environment for prop firm sim accounts...')
      
      const demoApiBaseUrl = TRADOVATE_ENVIRONMENTS['demo'].api
      for (const endpoint of accountEndpoints) {
        try {
          console.log(`Trying ${endpoint.name} on DEMO at ${endpoint.url.replace(apiBaseUrl, demoApiBaseUrl)}`)
          
          const requestOptions: RequestInit = {
            method: endpoint.method,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
          
          if (endpoint.body) {
            requestOptions.body = JSON.stringify(endpoint.body)
          }
          
          const demoUrl = endpoint.url.replace(apiBaseUrl, demoApiBaseUrl)
          const response = await fetch(demoUrl, requestOptions)
          
          console.log(`${endpoint.name} (DEMO) response:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentLength: response.headers.get('content-length')
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log(`${endpoint.name} (DEMO) data:`, data)
            
            if (Array.isArray(data) && data.length > 0) {
              accounts = data
              console.log(`✅ Found ${data.length} accounts via ${endpoint.name} on DEMO environment`)
              break
            } else if (data && !Array.isArray(data)) {
              accounts = [data]
              console.log(`✅ Found 1 account via ${endpoint.name} on DEMO environment`)
              break
            }
          }
        } catch (error) {
          console.log(`${endpoint.name} (DEMO) failed:`, error)
          continue
        }
      }
    }

    // Check if we found any accounts
    if (accounts.length === 0) {
      console.error('No accounts found via any endpoint on either environment')
      return { error: 'No accounts found on live or demo environments. For ApexTraderFunding, try switching to Demo environment and reconnecting.' }
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

// Transform Tradovate fills to our Trade format
function transformTradovateToTrades(fills: TradovateFill[], accountId: number, userId: string): Trade[] {
  console.log('Transforming Tradovate fills:', { fillCount: fills.length, accountId, userId })

  // Group fills by instrument and pair buy/sell orders
  const fillsByInstrument = new Map<string, TradovateFill[]>()
  
  fills.forEach(fill => {
    const instrumentName = fill.instrument?.masterInstrument?.name || fill.instrument?.name || 'UNKNOWN'
    if (!fillsByInstrument.has(instrumentName)) {
      fillsByInstrument.set(instrumentName, [])
    }
    fillsByInstrument.get(instrumentName)!.push(fill)
  })

  const trades: Trade[] = []

  fillsByInstrument.forEach((instrumentFills, instrumentName) => {
    console.log(`Processing ${instrumentFills.length} fills for ${instrumentName}`)
    
    // Sort by timestamp
    instrumentFills.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    // Simple approach: pair each buy with the next sell (FIFO)
    const buyFills = instrumentFills.filter(f => f.action === 'Buy')
    const sellFills = instrumentFills.filter(f => f.action === 'Sell')
    
    // Create trades by pairing buy and sell fills
    let sellIndex = 0
    buyFills.forEach(buyFill => {
      if (sellIndex < sellFills.length) {
        const sellFill = sellFills[sellIndex]
        sellIndex++
        
        // Calculate PnL (simplified - you may need to adjust for contract multipliers)
        const pnl = (sellFill.price - buyFill.price) * buyFill.qty
        
        // Calculate time in position (seconds)
        const entryTime = new Date(buyFill.timestamp).getTime()
        const exitTime = new Date(sellFill.timestamp).getTime()
        const timeInPosition = Math.round((exitTime - entryTime) / 1000)
        
        const trade: Trade = {
          id: crypto.randomUUID(),
          accountNumber: accountId.toString(),
          quantity: buyFill.qty,
          entryId: buyFill.id.toString(),
          closeId: sellFill.id.toString(),
          instrument: instrumentName,
          entryPrice: buyFill.price.toString(),
          closePrice: sellFill.price.toString(),
          entryDate: buyFill.timestamp,
          closeDate: sellFill.timestamp,
          pnl: pnl,
          timeInPosition: timeInPosition,
          userId: userId,
          side: 'Long', // Tradovate fills start with buy, so it's a long position
          commission: 0, // You might need to fetch this separately or estimate
          createdAt: new Date(),
          comment: `Tradovate sync - ${buyFill.fillType}`,
          videoUrl: null,
          tags: ['tradovate-sync'],
          imageBase64: null,
          imageBase64Second: null,
          groupId: null
        }
        
        trades.push(trade)
      }
    })
  })

  console.log(`Transformed ${fills.length} fills into ${trades.length} trades`)
  return trades
}

export async function getTradovateTrades(accessToken: string, accountId: number, environment: 'demo' | 'live' = 'demo'): Promise<TradovateTradesResult> {
  try {
    console.log('Fetching Tradovate trades:', { accountId, environment })
    
    // Get current user for userId
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'User not authenticated' }
    }

    // Use the selected environment for fills/trades data
    const apiBaseUrl = TRADOVATE_ENVIRONMENTS[environment].api
    const response = await fetch(`${apiBaseUrl}/v1/fill/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        accountId,
        startTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        endTimestamp: new Date().toISOString()
      })
    })

    console.log('Tradovate fills response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch trades:', { status: response.status, errorText })
      return { error: `Failed to fetch trades: ${errorText}` }
    }

    const fills: TradovateFill[] = await response.json()
    console.log('Received fills from Tradovate:', { 
      fillCount: fills.length,
      sampleFill: fills[0] // Log first fill to understand structure
    })
    
    if (!Array.isArray(fills) || fills.length === 0) {
      console.log('No fills returned from Tradovate')
      return { trades: fills, processedTrades: [], savedCount: 0 }
    }

    // Transform fills to our Trade format
    const processedTrades = transformTradovateToTrades(fills, accountId, user.id)
    
    if (processedTrades.length === 0) {
      console.log('No trades could be created from fills')
      return { trades: fills, processedTrades: [], savedCount: 0 }
    }

    // Save trades to database
    console.log(`Attempting to save ${processedTrades.length} trades to database`)
    const saveResult = await saveTradesAction(processedTrades)
    
    if (saveResult.error) {
      console.error('Failed to save trades:', saveResult.error, saveResult.details)
      return { 
        error: `Failed to save trades: ${saveResult.error}`,
        trades: fills,
        processedTrades: processedTrades 
      }
    }

    console.log(`Successfully saved ${saveResult.numberOfTradesAdded} trades`)
    
    return { 
      trades: fills,
      processedTrades: processedTrades,
      savedCount: saveResult.numberOfTradesAdded
    }
  } catch (error) {
    console.error('Failed to get Tradovate trades:', error)
    return { error: 'Failed to get trades' }
  }
}

 