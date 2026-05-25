/**
 * Verifies DxFeed trade mapping against live API (no DB).
 * Run: DXFEED_ENVIRONMENT=0 npx tsx scripts/verify-dxfeed-trade-mapping.ts
 */

import 'dotenv/config'
import { resolveDxFeedHistoricalHost } from '../lib/dxfeed-historical-host'

const DXFEED_AUTH_URL = process.env.DXFEED_AUTH_URL
const DXFEED_PLATFORM_KEY = process.env.DXFEED_PLATFORM_KEY
const LOGIN = process.env.DXFEED_USERNAME
const PASSWORD = process.env.DXFEED_PASSWORD
const ENVIRONMENT = process.env.DXFEED_ENVIRONMENT
  ? parseInt(process.env.DXFEED_ENVIRONMENT, 10)
  : 0

function extractInstrumentSymbol(contract: { symbol?: string | null; contractName?: string | null } | null): string {
  if (!contract) return 'Unknown'
  const raw = (contract.symbol || contract.contractName || '').toUpperCase()
  const withoutExchange = raw.split(':')[0]
  const clean = withoutExchange.startsWith('/') ? withoutExchange.slice(1) : withoutExchange
  const monthCodeMatch = clean.match(/^([A-Z]+?)[FGHJKMNQUVXZ]\d+$/i)
  if (monthCodeMatch) return monthCodeMatch[1].toUpperCase()
  const lettersOnly = clean.replace(/[^A-Z]/g, '')
  return lettersOnly || 'Unknown'
}

async function main() {
  if (!LOGIN || !PASSWORD || !DXFEED_AUTH_URL || !DXFEED_PLATFORM_KEY) {
    console.error('Missing DXFEED_* env vars')
    process.exit(1)
  }

  const authRes = await fetch(DXFEED_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', PltfKey: DXFEED_PLATFORM_KEY },
    body: JSON.stringify({
      login: LOGIN,
      password: PASSWORD,
      environment: ENVIRONMENT,
      version: 3,
      withDetails: true,
      connectOnlyTrading: true,
    }),
  })
  const authData = await authRes.json()
  const token = authData.tradingRestReportToken || authData.token
  const host = resolveDxFeedHistoricalHost(authData, authRes.headers)
  if (!host) {
    console.error('Could not resolve historical host')
    process.exit(1)
  }
  console.log('propfirm:', authData.propfirmName, 'host:', host)

  const accountsRes = await fetch(`${host}/api/historical/TradingAccount/List`, {
    headers: { Authorization: token, Accept: 'application/json' },
  })
  const accountsPayload = await accountsRes.json()
  const accounts = Array.isArray(accountsPayload) ? accountsPayload : accountsPayload.data || []
  const accountRef = accounts[0]?.accountReference
  if (!accountRef) {
    console.error('No account reference')
    process.exit(1)
  }

  const startDt = new Date('2026-05-25T00:00:00Z').toISOString()
  const endDt = new Date().toISOString()
  const tradesRes = await fetch(
    `${host}/api/historical/TradingAccount/Trades/${accountRef}?startDt=${encodeURIComponent(startDt)}&endDt=${encodeURIComponent(endDt)}`,
    { headers: { Authorization: token, Accept: 'application/json' } },
  )
  const reportTrades: any[] = await tradesRes.json()
  const closed = reportTrades.filter((t) => t.exitDate > 0)

  console.log(`Closed trades today: ${closed.length}`)
  for (const rt of closed) {
    const instrument = extractInstrumentSymbol(rt.contract)
    const entryDate = new Date(rt.entryDate)
    const exitDate = new Date(rt.exitDate)
    console.log({
      symbolName: rt.symbolName,
      instrument,
      entryPrice: rt.entryPrice,
      exitPrice: rt.exitPrice,
      quantity: rt.quantity,
      netPl: rt.netPl,
      entryDate: entryDate.toISOString(),
      exitDate: exitDate.toISOString(),
      durationSec: Math.round((exitDate.getTime() - entryDate.getTime()) / 1000),
    })
  }

  const esTrade = closed.find((t) => (t.symbolName || '').includes('ES'))
  if (!esTrade) {
    console.error('Expected ES trade not found')
    process.exit(1)
  }

  const ok =
    esTrade.entryPrice === 7561 &&
    esTrade.exitPrice === 7560.75 &&
    esTrade.netPl === -17.5 &&
    esTrade.quantity === 1

  if (!ok) {
    console.error('Trade values mismatch', esTrade)
    process.exit(1)
  }

  console.log('OK: ES trade matches expected entry/exit/PnL')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
