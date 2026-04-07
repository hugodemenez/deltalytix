/**
 * Debug script to test DxFeed API and inspect raw trade response.
 * Run with: npx tsx scripts/debug-dxfeed-trades.ts
 *
 * Requires: DXFEED_AUTH_URL, DXFEED_PLATFORM_KEY in .env
 */

import 'dotenv/config'

const DXFEED_AUTH_URL = process.env.DXFEED_AUTH_URL
const DXFEED_PLATFORM_KEY = process.env.DXFEED_PLATFORM_KEY

const LOGIN = process.env.DXFEED_USERNAME
const PASSWORD = process.env.DXFEED_PASSWORD
// 0=Production, 1=Staging (demo)
const ENVIRONMENT = process.env.DXFEED_ENVIRONMENT
  ? parseInt(process.env.DXFEED_ENVIRONMENT, 10)
  : 1
const HISTORY_LOOKBACK_DAYS = process.env.DXFEED_HISTORY_LOOKBACK_DAYS
  ? parseInt(process.env.DXFEED_HISTORY_LOOKBACK_DAYS, 10)
  : 364

function normalizeHistoricalHost(value?: string | null) {
  if (!value) return ''

  try {
    const parsed = new URL(value)
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
  } catch {
    return value.replace(/\/$/, '')
  }
}

function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data
  }
  return []
}

function extractApiError(payload: unknown): string | null {
  if (Array.isArray(payload)) {
    const first = payload.find(
      (item): item is { message?: string } => !!item && typeof item === 'object' && 'message' in item,
    )
    return first?.message ?? null
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    return typeof message === 'string' ? message : null
  }

  return null
}

function buildHistoricalAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: token,
    Accept: 'application/json',
  }
}

async function main() {
  if (!LOGIN || !PASSWORD) {
    console.error('Set DXFEED_USERNAME and DXFEED_PASSWORD in .env')
    process.exit(1)
  }
  console.log('Using environment:', ENVIRONMENT, ENVIRONMENT === 1 ? '(Staging/demo)' : '(Production)')
  if (!DXFEED_AUTH_URL || !DXFEED_PLATFORM_KEY) {
    console.error('Missing DXFEED_AUTH_URL or DXFEED_PLATFORM_KEY in .env')
    process.exit(1)
  }

  console.log('1. Authenticating...')
  const authRes = await fetch(DXFEED_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      PltfKey: DXFEED_PLATFORM_KEY,
    },
    body: JSON.stringify({
      login: LOGIN,
      password: PASSWORD,
      environment: ENVIRONMENT,
      version: 3,
      withDetails: true,
      connectOnlyTrading: true,
    }),
  })

  if (!authRes.ok) {
    console.error('Auth failed:', authRes.status, await authRes.text())
    process.exit(1)
  }

  const authData = await authRes.json()
  if (authData.status !== 'OK' || !authData.token) {
    console.error('Auth error:', authData.reason || authData)
    process.exit(1)
  }

  const token = authData.tradingRestReportToken || authData.token
  const historicalHost =
    normalizeHistoricalHost(authData.tradingRestReportHost) ||
    normalizeHistoricalHost(authData.tradingWss ? `https://${new URL(authData.tradingWss).hostname}` : '') ||
    normalizeHistoricalHost(
      authRes.headers.get('wss') ? `https://${new URL(authRes.headers.get('wss')!).hostname}` : '',
    )

  if (!historicalHost) {
    console.error('No historical host from wss header')
    process.exit(1)
  }

  console.log('Auth OK, historicalHost:', historicalHost)

  console.log('\n2. Fetching accounts...')
  const accountsRes = await fetch(`${historicalHost}/api/historical/TradingAccount/List`, {
    headers: buildHistoricalAuthHeaders(token),
  })

  if (!accountsRes.ok) {
    console.error('Accounts failed:', accountsRes.status, await accountsRes.text())
    process.exit(1)
  }

  const accountsData = await accountsRes.json()
  const accounts = extractArrayPayload<any>(accountsData)
  console.log('Accounts:', JSON.stringify(accounts, null, 2))

  if (accounts.length === 0) {
    console.log('No accounts found')
    process.exit(0)
  }

  for (const account of accounts) {
    const accountId = account.accountId
    const accountRef = account.accountReference || String(accountId)
    const accountLabel = account.accountHeader || accountRef

    console.log(`\n3. Fetching trades for account ${accountLabel} (id: ${accountId}, ref: ${accountRef})...`)
    const endDt = new Date().toISOString()
    const startDt = new Date(Date.now() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const tradesUrl = `${historicalHost}/api/historical/TradingAccount/Trades/${accountRef}?startDt=${encodeURIComponent(startDt)}&endDt=${encodeURIComponent(endDt)}`
    console.log('  URL:', tradesUrl)
    const tradesRes = await fetch(tradesUrl, {
      headers: buildHistoricalAuthHeaders(token),
    })

    if (!tradesRes.ok) {
      console.error(`Trades failed for ${accountLabel}:`, tradesRes.status, await tradesRes.text())
      continue
    }

    const tradesData = await tradesRes.json()
    const apiError = extractApiError(tradesData)
    if (apiError) {
      console.error(`Trades API error for ${accountLabel}:`, apiError)
      continue
    }
    const reportTrades = extractArrayPayload<any>(tradesData)

    console.log(`\nRaw trades response for ${accountLabel}:`)
    console.log('  response type:', Array.isArray(tradesData) ? 'array' : typeof tradesData)
    console.log('  success:', (tradesData as any)?.success)
    console.log('  data length:', reportTrades.length)
    console.log('\n  Sample trade (first):', JSON.stringify(reportTrades[0], null, 2))

    if (reportTrades.length > 0) {
      console.log('\n  All trades summary:')
      reportTrades.forEach((rt: any, i: number) => {
        const skipReason =
          !rt.isCloseTrade && rt.exitDate === 0
            ? 'SKIPPED (isCloseTrade=false, exitDate=0)'
            : 'KEPT'
        console.log(
          `    [${i}] tradeId=${rt.tradeId} isCloseTrade=${rt.isCloseTrade} exitDate=${rt.exitDate} entryDate=${rt.entryDate} qty=${rt.quantity} -> ${skipReason}`,
        )
      })
    }
  }

  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
