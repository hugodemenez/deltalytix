/*
  Standalone Tradovate debug script

  Usage examples:
  - bun run scripts/tradovate-debug.ts                    // OAuth (demo only)
  - bun run scripts/tradovate-debug.ts --method=password  // Legacy password flow (optional)

  Required environment variables (OAuth flow):
  - TRADOVATE_CLIENT_ID
  - TRADOVATE_CLIENT_SECRET
  - TRADOVATE_REDIRECT_URI (e.g. http://localhost:8787/tradovate/callback)

  Required environment variables (username/cid/sec flow):
  - TRADOVATE_USERNAME
  - TRADOVATE_PASSWORD
  - TRADOVATE_CID
  - TRADOVATE_SECRET

  Notes:
  - /v1/auth/me is only available on LIVE base; other endpoints depend on chosen env.
*/

/* eslint-disable no-console */

type Environment = 'demo'
type AuthMethod = 'oauth' | 'password'
interface PersistedToken {
  accessToken: string
  refreshToken?: string
  expiresAt?: string // ISO
  method: AuthMethod
  env: Environment
}

import path from 'path'
import { promises as fs } from 'fs'

const TOKEN_FILE = path.resolve(process.cwd(), '.tradovate-token.demo.json')

async function loadToken(): Promise<PersistedToken | null> {
  try {
    const raw = await fs.readFile(TOKEN_FILE, 'utf8')
    return JSON.parse(raw) as PersistedToken
  } catch {
    return null
  }
}

async function saveToken(token: PersistedToken): Promise<void> {
  try {
    await fs.writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf8')
  } catch (err) {
    console.warn('Failed to persist token:', err)
  }
}

function isExpired(expiresAt?: string, skewSeconds = 60): boolean {
  if (!expiresAt) return false
  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  return now + skewSeconds * 1000 >= exp
}


const TRADOVATE_ENVIRONMENTS: Record<Environment, { auth: string; api: string }> = {
  demo: {
    auth: 'https://trader.tradovate.com',
    api: 'https://demo.tradovateapi.com',
  },
}

interface TradovateAuthRequestBody {
  name: string
  password: string
  appId: string
  appVersion: string
  cid: number
  sec: string
  deviceId: string
  'p-ticket'?: string
}

interface TradovateApiAuthResponse {
  'p-ticket'?: string
  'p-time'?: number
  'p-captcha'?: boolean
  accessToken?: string
  mdAccessToken?: string
  userId?: number
  userStatus?: string
  name?: string
  expirationTime?: string | number
  errorText?: string
}

interface TradovateAccount {
  id: number
  name: string
  nickname?: string
}

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

function parseArgs(): { env: Environment; method: AuthMethod } {
  const argv = process.argv.slice(2)
  const methodArg = argv.find((a) => a.startsWith('--method='))?.split('=')[1] as AuthMethod | undefined

  // Force demo regardless of flag
  const env: Environment = 'demo'
  const method: AuthMethod = methodArg === 'password' ? 'password' : 'oauth'
  return { env, method }
}

async function getAccessTokenPassword(): Promise<{ accessToken: string; expiresAt?: string }> {
  const username = process.env.TRADOVATE_USERNAME || ''
  const password = process.env.TRADOVATE_PASSWORD || ''
  const cid = process.env.TRADOVATE_CID
  const sec = process.env.TRADOVATE_SECRET

  if (!username || !password || !cid || !sec) {
    throw new Error('Missing Tradovate env: TRADOVATE_USERNAME, TRADOVATE_PASSWORD, TRADOVATE_CID, TRADOVATE_SECRET')
  }

  const deviceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`

  const body: TradovateAuthRequestBody = {
    name: username,
    password,
    appId: 'Deltalytix',
    appVersion: '0.0.1',
    cid: parseInt(cid, 10),
    sec,
    deviceId,
  }

  const res = await fetch(TRADOVATE_ENVIRONMENTS.demo.api + '/v1/auth/accessTokenRequest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`/auth/accessTokenRequest failed: ${res.status} ${res.statusText} - ${text}`)
  }

  const data: TradovateApiAuthResponse = await res.json()
  if (data['p-captcha']) {
    throw new Error('Captcha required by Tradovate. Complete login in UI to proceed.')
  }
  if (!data.accessToken) {
    throw new Error(data.errorText || 'No accessToken returned from Tradovate')
  }
  const expiresAt = typeof data.expirationTime === 'number'
    ? new Date(data.expirationTime).toISOString()
    : (data.expirationTime as string | undefined)
  return { accessToken: data.accessToken, expiresAt }
}

async function getAccessTokenOAuth(env: Environment): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
  const clientId = process.env.TRADOVATE_CLIENT_ID
  const clientSecret = process.env.TRADOVATE_CLIENT_SECRET
  const redirectUri = process.env.TRADOVATE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth env: TRADOVATE_CLIENT_ID, TRADOVATE_CLIENT_SECRET, TRADOVATE_REDIRECT_URI')
  }

  // Build Auth URL
  const state = Math.random().toString(36).slice(2)
  const authBaseUrl = TRADOVATE_ENVIRONMENTS[env].auth
  const apiBaseUrl = TRADOVATE_ENVIRONMENTS[env].api
  const authUrl = new URL(`${authBaseUrl}/oauth`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'read write')
  authUrl.searchParams.set('state', state)

  // Prepare local server to capture callback
  const { createServer } = await import('http')
  const cbUrl = new URL(redirectUri)
  const listenPort = Number(cbUrl.port || (cbUrl.protocol === 'https:' ? 443 : 80))
  const listenPath = cbUrl.pathname || '/'
  const listenHost = cbUrl.hostname || 'localhost'

  console.log('Open this URL in your browser to authorize:')
  console.log(authUrl.toString())
  console.log(`Waiting for OAuth callback on ${listenHost}:${listenPort}${listenPath} ...`)

  const code: string = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        if (!req.url) return
        const url = new URL(req.url, `${cbUrl.protocol}//${req.headers.host}`)
        if (url.pathname !== listenPath) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }
        const codeParam = url.searchParams.get('code')
        const stateParam = url.searchParams.get('state')
        if (!codeParam) {
          res.statusCode = 400
          res.end('Missing code')
          return
        }
        if (stateParam !== state) {
          res.statusCode = 400
          res.end('Invalid state')
          return
        }
        res.statusCode = 200
        res.end('Authorization successful. You can close this tab and return to the terminal.')
        server.close()
        resolve(codeParam)
      } catch (e) {
        reject(e)
      }
    })
    server.on('error', reject)
    server.listen(listenPort, listenHost)
  })

  // Exchange code for tokens (demo OAuth)
  const tokenRes = await fetch(`${TRADOVATE_ENVIRONMENTS.demo.api}/auth/oauthtoken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    }),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Token exchange failed: ${tokenRes.status} ${tokenRes.statusText} - ${text}`)
  }
  const tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens.access_token) {
    throw new Error('No access_token returned from OAuth token exchange')
  }
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt }
}

async function refreshOAuthToken(env: Environment, refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
  const clientId = process.env.TRADOVATE_CLIENT_ID!
  const clientSecret = process.env.TRADOVATE_CLIENT_SECRET!
  // Always use demo for OAuth token refresh
  const res = await fetch(`${TRADOVATE_ENVIRONMENTS.demo.api}/auth/oauthtoken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Refresh token failed: ${res.status} ${res.statusText} - ${text}`)
  }
  const tokens = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens.access_token) {
    throw new Error('No access_token returned from refresh')
  }
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? refreshToken, expiresAt }
}

// DEMO: list users to obtain a userId for deps
async function listUsers(accessToken: string, env: Environment): Promise<Array<{ id: number; name?: string; email?: string }>> {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const res = await fetch(`${apiBase}/v1/user/list`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`/v1/user/list failed: ${res.status} ${res.statusText} - ${text}`)
  }
  const users = (await res.json()) as Array<{ id: number; name?: string; email?: string }>
  return Array.isArray(users) ? users : []
}

// listAccounts helper retained if needed later (unused for now)

// listFills helper retained for future debugging, currently unused

async function getAccountDepsByUser(accessToken: string, env: Environment, userId: number) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  if (!userId) {
    throw new Error('getAccountDepsByUser requires a valid userId')
  }
  const query = new URLSearchParams({ masterid: String(userId) }).toString()
  const res = await fetch(`${apiBase}/v1/account/deps?${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`/v1/account/deps failed: ${res.status} ${res.statusText} - ${text}`)
  }
  return res.json()
}

async function suggestAccounts(accessToken: string, env: Environment, text: string, limit = 3) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const params = new URLSearchParams({ t: text, l: String(limit) }).toString()
  const res = await fetch(`${apiBase}/v1/account/suggest?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/account/suggest failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function findAccountByName(accessToken: string, env: Environment, name: string) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const params = new URLSearchParams({ name }).toString()
  const res = await fetch(`${apiBase}/v1/account/find?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/account/find failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function listAccounts(accessToken: string, env: Environment) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const res = await fetch(`${apiBase}/v1/account/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/account/list failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function listFillPairs(accessToken: string, env: Environment) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const res = await fetch(`${apiBase}/v1/fillPair/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/fillPair/list failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function listPositions(accessToken: string, env: Environment) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const res = await fetch(`${apiBase}/v1/position/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/position/list failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function getContractById(accessToken: string, env: Environment, contractId: number) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const params = new URLSearchParams({ id: String(contractId) }).toString()
  const res = await fetch(`${apiBase}/v1/contract/item?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/contract/item failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function getFillFeeById(accessToken: string, env: Environment, fillId: number) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const params = new URLSearchParams({ id: String(fillId) }).toString()
  const res = await fetch(`${apiBase}/v1/fillFee/item?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/fillFee/item failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function listExecutionReports(accessToken: string, env: Environment) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const res = await fetch(`${apiBase}/v1/executionReport/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/executionReport/list failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function listFills(accessToken: string, env: Environment) {
  const apiBase = TRADOVATE_ENVIRONMENTS[env].api
  const res = await fetch(`${apiBase}/v1/fill/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`/v1/fill/list failed: ${res.status} ${res.statusText} - ${msg}`)
  }
  return res.json()
}

async function main() {
  const { env, method } = parseArgs()
  console.log(`[Tradovate Debug] env=${env}, method=${method}`)

  // Try persisted token first
  let persisted = await loadToken()
  if (persisted && (persisted.env !== env || persisted.method !== method)) {
    persisted = null
  }

  let accessToken: string
  let refreshToken: string | undefined
  let expiresAt: string | undefined

  try {
    if (persisted && !isExpired(persisted.expiresAt)) {
      accessToken = persisted.accessToken
      refreshToken = persisted.refreshToken
      expiresAt = persisted.expiresAt
      console.log('Using persisted access token')
    } else if (persisted && persisted.refreshToken && method === 'oauth') {
      console.log('Refreshing OAuth token...')
      const refreshed = await refreshOAuthToken(env, persisted.refreshToken)
      accessToken = refreshed.accessToken
      refreshToken = refreshed.refreshToken
      expiresAt = refreshed.expiresAt
      await saveToken({ accessToken, refreshToken, expiresAt, method, env })
    } else {
      console.log('Acquiring new token...')
      if (method === 'password') {
        const t = await getAccessTokenPassword()
        accessToken = t.accessToken
        expiresAt = t.expiresAt
        await saveToken({ accessToken, expiresAt, method, env })
      } else {
        const t = await getAccessTokenOAuth(env)
        accessToken = t.accessToken
        refreshToken = t.refreshToken
        expiresAt = t.expiresAt
        await saveToken({ accessToken, refreshToken, expiresAt, method, env })
      }
    }
  } catch (err) {
    console.error('Token acquisition/refresh failed, clearing persisted token.')
    try { await fs.unlink(TOKEN_FILE) } catch {}
    throw err
  }

  console.log('Access token acquired:', accessToken.substring(0, 12) + '...')

  // DEMO-only flow: get users, pick one, then deps via masterid
  const users = await listUsers(accessToken, 'demo')
  if (users.length === 0) {
    throw new Error('No users returned from /v1/user/list on demo')
  }
  console.log(`Demo users found: ${users.length}` )
  const selectedUser = users[0]
  console.log(`Selected user: id=${selectedUser.id} name=${selectedUser.name ?? ''} email=${selectedUser.email ?? ''}`)

  console.log('Fetching /v1/account/deps by user (masterid: ' + selectedUser.id + ') ...')
  const deps = await getAccountDepsByUser(accessToken, 'demo', selectedUser.id)
  console.log('Account deps payload (truncated preview):')
  try {
    const pretty = JSON.stringify(deps, null, 2)
    console.log(pretty.slice(0, 5000))
  } catch {
    console.log(deps)
  }

  // Try /v1/account/suggest with t as user name (fallback to email/"t") and l=3
  const q = (selectedUser.name || selectedUser.email || 't').toString()
  console.log(`Suggesting accounts: q="${q}", l=3`)
  try {
    const suggestions = await suggestAccounts(accessToken, 'demo', q, 3)
    console.log('Account suggest result:', suggestions)
  } catch (e) {
    console.warn('Suggest failed:', e instanceof Error ? e.message : e)
  }

  // Try to find specific account by name
  console.log('Finding account by name: XXXX')
  try {
    const foundAccount = await findAccountByName(accessToken, 'demo', 'XXXX')
    console.log('Account find result:', foundAccount)
  } catch (e) {
    console.warn('Account find failed:', e instanceof Error ? e.message : e)
  }

  // List all accounts
  console.log('Listing all accounts...')
  try {
    const accounts = await listAccounts(accessToken, 'demo')
    console.log('Account list result:', accounts)
  } catch (e) {
    console.warn('Account list failed:', e instanceof Error ? e.message : e)
  }

  // List fill pairs
  console.log('Listing fill pairs...')
  try {
    const fillPairs = await listFillPairs(accessToken, 'demo')
    console.log('Fill pairs result:', fillPairs)
  } catch (e) {
    console.warn('Fill pairs list failed:', e instanceof Error ? e.message : e)
  }

  // List positions
  console.log('Listing positions...')
  try {
    const positions = await listPositions(accessToken, 'demo')
    console.log('Positions result:', positions)
  } catch (e) {
    console.warn('Positions list failed:', e instanceof Error ? e.message : e)
  }

  // List fills and analyze contract details
  console.log('Listing fills...')
  try {
    const fills = await listFills(accessToken, 'demo')
    console.log(`Fills result: ${Array.isArray(fills) ? fills.length : 0} fills found`)
    
    if (Array.isArray(fills) && fills.length > 0) {
      // Extract unique contract IDs from fills
      const uniqueContractIds = [...new Set(fills.map((fill: any) => fill.contractId).filter(Boolean))]
      console.log(`\nUnique contract IDs found in fills: ${uniqueContractIds.join(', ')}`)
      
      // Fetch contract details for each unique contract ID
      const contractDetails: Record<number, any> = {}
      for (const contractId of uniqueContractIds) {
        try {
          console.log(`Fetching contract details for ID: ${contractId}`)
          const contract = await getContractById(accessToken, 'demo', contractId)
          contractDetails[contractId] = contract
          console.log(`Contract ${contractId}:`, contract)
        } catch (e) {
          console.warn(`Failed to fetch contract ${contractId}:`, e instanceof Error ? e.message : e)
        }
      }
      
      // Fetch fill fees for each fill
      console.log('\nFetching fill fees...')
      const fillFees: Record<number, any> = {}
      for (const fill of fills) {
        try {
          console.log(`Fetching fill fee for fill ID: ${fill.id}`)
          const fee = await getFillFeeById(accessToken, 'demo', fill.id)
          fillFees[fill.id] = fee
          console.log(`Fill fee ${fill.id}:`, fee)
        } catch (e) {
          console.warn(`Failed to fetch fill fee for fill ${fill.id}:`, e instanceof Error ? e.message : e)
        }
      }
      
      // Create enhanced fills with contract names and fees
      console.log('\n=== ENHANCED FILLS WITH CONTRACT NAMES AND FEES ===')
      const enhancedFills = fills.map((fill: any) => ({
        ...fill,
        contractName: contractDetails[fill.contractId]?.name || 'Unknown',
        contractSymbol: contractDetails[fill.contractId]?.symbol || 'Unknown',
        fee: fillFees[fill.id] || null
      }))
      
      enhancedFills.forEach((fill: any, index: number) => {
        console.log(`\nFill ${index + 1}:`)
        console.log(`  ID: ${fill.id}`)
        console.log(`  Contract: ${fill.contractName} (${fill.contractSymbol}) - ID: ${fill.contractId}`)
        console.log(`  Action: ${fill.action}`)
        console.log(`  Qty: ${fill.qty}`)
        console.log(`  Price: $${fill.price}`)
        console.log(`  Timestamp: ${fill.timestamp}`)
        console.log(`  Fee:`, fill.fee)
      })
    }
  } catch (e) {
    console.warn('Fills list failed:', e instanceof Error ? e.message : e)
  }

  // List execution reports
  console.log('Listing execution reports...')
  try {
    const executionReports = await listExecutionReports(accessToken, 'demo')
    console.log(`Execution reports result: ${Array.isArray(executionReports) ? executionReports.length : 0} reports found`)
    if (Array.isArray(executionReports) && executionReports.length > 0) {
      console.log('Sample execution report:', executionReports[0])
    }
  } catch (e) {
    console.warn('Execution reports list failed:', e instanceof Error ? e.message : e)
  }

  //   const targetAccount = accounts[0]
  //   const end = new Date()
  //   const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  //   console.log(`Fetching fills for account ${targetAccount.id} from ${start.toISOString()} to ${end.toISOString()}`)

//   const fills = await listFills(token, env, targetAccount.id, start, end)
//   console.log(`Received ${fills.length} fill(s). Sample:`)
//   console.log(fills[0] || null)
}

main()
  .then(() => {
    // done
  })
  .catch((err) => {
    console.error('Tradovate debug failed:', err)
    process.exitCode = 1
  })


