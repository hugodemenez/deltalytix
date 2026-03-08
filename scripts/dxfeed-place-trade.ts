/**
 * Places a test round-trip trade on DxFeed demo, then verifies historical retrieval.
 * Run with: npx tsx scripts/dxfeed-place-trade.ts
 *
 * Requires: DXFEED_AUTH_URL, DXFEED_PLATFORM_KEY, DXFEED_USERNAME, DXFEED_PASSWORD in .env
 */

import 'dotenv/config'
import WebSocket from 'ws'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const protobuf = require('protobufjs')

const DXFEED_AUTH_URL = process.env.DXFEED_AUTH_URL
const DXFEED_PLATFORM_KEY = process.env.DXFEED_PLATFORM_KEY
const LOGIN = process.env.DXFEED_USERNAME
const PASSWORD = process.env.DXFEED_PASSWORD
const ENVIRONMENT = process.env.DXFEED_ENVIRONMENT
  ? parseInt(process.env.DXFEED_ENVIRONMENT, 10)
  : 1
const HISTORY_LOOKBACK_DAYS = process.env.DXFEED_HISTORY_LOOKBACK_DAYS
  ? parseInt(process.env.DXFEED_HISTORY_LOOKBACK_DAYS, 10)
  : 364
const HISTORICAL_POLL_ATTEMPTS = 8
const HISTORICAL_POLL_INTERVAL_MS = 5000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (value?.toNumber) return value.toNumber()
  return Number(value)
}

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

async function auth(): Promise<{
  tradingToken: string
  reportToken: string
  wssUrl: string
  historicalHost: string
}> {
  if (!DXFEED_AUTH_URL || !DXFEED_PLATFORM_KEY || !LOGIN || !PASSWORD) {
    throw new Error('Set DXFEED_AUTH_URL, DXFEED_PLATFORM_KEY, DXFEED_USERNAME, DXFEED_PASSWORD')
  }

  const res = await fetch(DXFEED_AUTH_URL, {
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

  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (data.status !== 'OK' || !data.token) throw new Error(data.reason || 'Auth failed')

  const wssUrl = data.tradingWss || res.headers.get('wss')
  if (!wssUrl) throw new Error('No wss URL in auth response')

  const historicalHost =
    normalizeHistoricalHost(data.tradingRestReportHost) ||
    normalizeHistoricalHost(`https://${new URL(wssUrl).hostname}`)

  return {
    tradingToken: data.token,
    reportToken: data.tradingRestReportToken || data.token,
    wssUrl,
    historicalHost,
  }
}

async function fetchHistoricalAccounts(reportToken: string, historicalHost: string) {
  const response = await fetch(`${historicalHost}/api/historical/TradingAccount/List`, {
    headers: {
      Authorization: `Bearer ${reportToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Historical account fetch failed: ${response.status} ${await response.text()}`)
  }

  return extractArrayPayload<any>(await response.json())
}

async function fetchHistoricalTrades(
  reportToken: string,
  historicalHost: string,
  accountReference: string,
) {
  const endDt = new Date()
  const startDt = new Date(endDt.getTime() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const url = new URL(
    `${historicalHost}/api/historical/TradingAccount/Trades/${encodeURIComponent(accountReference)}`,
  )
  url.searchParams.set('startDt', startDt.toISOString())
  url.searchParams.set('endDt', endDt.toISOString())

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${reportToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Historical trades fetch failed: ${response.status} ${await response.text()}`)
  }

  return extractArrayPayload<any>(await response.json())
}

function findTrackedTrade(
  trades: any[],
  opts: { contractId: number; minEntryUtc: number; baselineTradeIds: Set<number> },
) {
  return trades.find((trade) => {
    const tradeId = toNumber(trade.tradeId)
    const contractId = toNumber(trade.contractId)
    const entryDate = toNumber(trade.entryDate)
    const exitDate = toNumber(trade.exitDate)

    return (
      contractId === opts.contractId &&
      exitDate > 0 &&
      entryDate >= opts.minEntryUtc &&
      !opts.baselineTradeIds.has(tradeId)
    )
  })
}

function chooseCandidateSymbols(symbols: any[]) {
  const candidates = symbols.filter((symbol) => {
    const contractId = toNumber(symbol.ContractId ?? symbol.contractId)
    const tradingInhibited = Boolean(symbol.TradingInhibited ?? symbol.tradingInhibited)
    return contractId > 0 && !tradingInhibited
  })

  const rank = (symbol: any) => {
    const category = toNumber(symbol.Category ?? symbol.category)
    if (category === 6) return 0 // Crypto is the best weekend test candidate.
    if (category === 2) return 1 // Forex next.
    if (category === 1) return 2 // Futures.
    return 3
  }

  return candidates.sort((a, b) => rank(a) - rank(b))
}

function buildTestCandidates(symbols: any[]) {
  const allCandidates = chooseCandidateSymbols(symbols)
  const byCategory = (category: number) =>
    allCandidates.filter((symbol) => toNumber(symbol.Category ?? symbol.category) === category)
  const used = new Set<number>()
  const selected: any[] = []

  const append = (items: any[], limit: number) => {
    for (const item of items) {
      const contractId = toNumber(item.ContractId ?? item.contractId)
      if (used.has(contractId)) continue
      selected.push(item)
      used.add(contractId)
      if (selected.length >= limit) break
    }
  }

  append(byCategory(6), 4) // Crypto
  append(byCategory(2), 6) // Forex
  append(byCategory(1), 8) // Futures
  append(allCandidates, 10) // Fill any remaining gaps

  return selected
}

async function main() {
  console.log('1. Authenticating for historical API...')
  const reportAuth = await auth()
  const { reportToken, historicalHost } = reportAuth
  console.log('   Historical auth OK')
  console.log('   Environment:', ENVIRONMENT === 1 ? 'Staging/demo' : 'Production')

  console.log('2. Fetching historical account mapping...')
  const historicalAccounts = await fetchHistoricalAccounts(reportToken, historicalHost)
  console.log('   Historical accounts found:', historicalAccounts.length)

  console.log('3. Authenticating for WebSocket trading...')
  const tradingAuth = await auth()
  const { tradingToken, wssUrl } = tradingAuth
  console.log('   Trading auth OK')

  console.log('4. Loading protobuf...')
  const protoPath = path.join(process.cwd(), 'Platform Development', 'PropTradingProtocol.proto')
  const root = await new Promise<any>((resolve, reject) => {
    protobuf.load(protoPath, (err: Error | null, root?: any) => {
      if (err) reject(err)
      else resolve(root!)
    })
  })
  const ClientRequestMsg = root.lookupType('PropTradingProtocol.ClientRequestMsg')
  const ServerResponseMsg = root.lookupType('PropTradingProtocol.ServerResponseMsg')

  console.log('5. Connecting WebSocket...')
  const ws = new WebSocket(wssUrl)

  const waitFor = <T>(check: (msg: unknown) => T | undefined, debug = false): Promise<T> =>
    new Promise((resolve, reject) => {
      const handler = (data: Buffer) => {
        try {
          const msg = ServerResponseMsg.decode(data)
          if (debug && (msg.ContractMsg || (msg as any).ContractsResps)) {
            console.log('   [DEBUG] Contract response:', JSON.stringify(msg, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
          }
          const result = check(msg)
          if (result !== undefined) {
            ws.off('message', handler)
            resolve(result)
          }
        } catch (e) {
          // ignore decode errors
        }
      }
      ws.on('message', handler)
      setTimeout(() => {
        ws.off('message', handler)
        reject(new Error('Timeout'))
      }, 15000)
    })

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  const send = (msg: object) => {
    const err = ClientRequestMsg.verify(msg)
    if (err) throw new Error(err)
    const encoded = ClientRequestMsg.encode(ClientRequestMsg.create(msg)).finish()
    ws.send(Buffer.from(encoded))
  }

  console.log('6. Sending login...')
  send({ LoginReq: { Token: tradingToken } })

  const loginOk = await waitFor((m: any) => {
    if (m.LoginMsg) return m.LoginMsg.Success ? true : m.LoginMsg.Reason
    return undefined
  })
  if (loginOk !== true) throw new Error(`Login failed: ${loginOk}`)
  console.log('   Login OK')

  console.log('7. Getting accounts over WebSocket...')
  send({ InfoReq: { Mode: 1 } }) // Account = 1

  const accounts = await waitFor((m: any) => {
    if (m.InfoMsg?.AccountList?.length) return m.InfoMsg.AccountList
    return undefined
  })
  const accNum = accounts[0]?.AccountNumber ?? accounts[0]?.accountNumber
  const accountNumber = typeof accNum === 'object' && accNum?.toNumber ? accNum.toNumber() : Number(accNum)
  const accountHeader = accounts[0]?.AccountHeader ?? accounts[0]?.accountHeader
  if (!accountNumber) throw new Error('No accounts')
  console.log('   Account:', accountNumber, accountHeader)

  const historicalAccount = historicalAccounts.find(
    (account: any) =>
      toNumber(account.accountId) === accountNumber ||
      account.accountHeader === accountHeader ||
      account.accountReference === String(accountNumber),
  )
  if (!historicalAccount?.accountReference) {
    throw new Error(`Could not map trading account ${accountNumber} to historical account reference`)
  }
  console.log('   Historical reference:', historicalAccount.accountReference)

  const baselineTrades = await fetchHistoricalTrades(
    reportToken,
    historicalHost,
    historicalAccount.accountReference,
  )
  const baselineTradeIds = new Set(baselineTrades.map((trade: any) => toNumber(trade.tradeId)))
  console.log('   Baseline historical trades:', baselineTrades.length)

  console.log('8. Getting orders/positions snapshot...')
  send({ InfoReq: { Mode: 2 } }) // OrdAndPos = 2
  send({ InfoReq: { Mode: 3 } }) // Positions = 3
  await sleep(2000)

  console.log('9. Getting available symbols via SymbolLookup...')
  send({ SymbolLookup: {} })

  const symbolsResp = await waitFor((m: any) => {
    if (m.SymbolLookup?.Symbols?.length) return m.SymbolLookup.Symbols
    return undefined
  })

  const candidateSymbols = buildTestCandidates(symbolsResp)
  const symbolWithId = candidateSymbols[0]

  if (!symbolWithId) {
    console.log('   No tradable symbols found in demo. Skipping order placement.')
    console.log('   SymbolLookup returned:', symbolsResp?.length ?? 0, 'symbols')
    ws.close()
    console.log('   Running debug script to fetch trades (may be empty)...')
    const { execSync } = await import('child_process')
    execSync('npx tsx scripts/debug-dxfeed-trades.ts', {
      stdio: 'inherit',
      env: { ...process.env, DXFEED_ENVIRONMENT: '1' },
    })
    return
  }

  const cid = typeof symbolWithId.ContractId === 'object' && symbolWithId.ContractId?.toNumber
    ? symbolWithId.ContractId.toNumber()
    : Number(symbolWithId.ContractId)
  const symName = symbolWithId.Symbol ?? symbolWithId.symbol ?? 'unknown'
  console.log('   Using symbol:', symName, 'ContractId:', cid)

  const tradeStartUtc = Date.now() - 60_000
  let activeCid = cid
  let activeSymbolName = symName
  let nextSeqClientId = 1

  const waitForOrderEvent = async (seqClientId: number, label: string) => {
    try {
      const orderInfo = await waitFor((m: any) => {
        const match = m.OrderInfo?.find((order: any) => {
          const seq = toNumber(order.SeqClientId ?? order.seqClientId)
          const org = toNumber(order.OrgClientId ?? order.orgClientId)
          return seq === seqClientId || org === seqClientId
        })
        return match
      })
      const state = orderInfo.OrderState ?? orderInfo.orderState
      const filledQty = toNumber(orderInfo.FilledQty ?? orderInfo.filledQty)
      console.log(`   ${label} update received: state=${state} filledQty=${filledQty}`)
      if (
        state === 2 ||
        state === 3 ||
        String(state).toLowerCase().includes('error')
      ) {
        const reason = orderInfo.Reason ?? orderInfo.reason ?? 'unknown'
        console.log('   Order error reason:', reason)
        return { orderInfo, error: reason }
      }
      return { orderInfo, error: null as string | null }
    } catch {
      console.log(`   (No ${label.toLowerCase()} update within 15s)`)
      return { orderInfo: null, error: null as string | null }
    }
  }

  const waitForPositionQty = async (expectedQty: number, label: string) => {
    try {
      const positionInfo = await waitFor((m: any) => {
        const match = m.PositionInfo?.find((position: any) => {
          const contractId = toNumber(position.ContractId ?? position.contractId)
          const openQty = toNumber(position.OpenQuantity ?? position.openQuantity)
          return contractId === activeCid && openQty === expectedQty
        })
        return match
      })
      console.log(
        `   ${label}: openQty=${toNumber(positionInfo.OpenQuantity ?? positionInfo.openQuantity)}`
      )
      return positionInfo
    } catch {
      console.log(`   (Did not observe ${label.toLowerCase()} within 15s)`)
      return null
    }
  }

  const tryEntryOrder = async (contractId: number, symbolName: string) => {
    const seqClientId = nextSeqClientId++
    console.log(`10. Trying MARKET buy on ${symbolName}...`)
    send({
      Order: [
        {
          OrderInsert: {
            AccNumber: accountNumber,
            ContractId: contractId,
            SeqClientId: seqClientId,
            Quantity: 1,
            Price: 0,
            OrderType: 0, // Market = 0
            Source: 1, // Manual
          },
        },
      ],
    })
    return waitForOrderEvent(seqClientId, `Buy order for ${symbolName}`)
  }

  const attemptedSymbols: Array<{ symbol: string; error: string }> = []
  let buyOrderResult: { orderInfo: any; error: string | null } | null = null
  for (const candidate of candidateSymbols.slice(0, 8)) {
    const candidateCid = toNumber(candidate.ContractId ?? candidate.contractId)
    const candidateName = candidate.Symbol ?? candidate.symbol ?? String(candidateCid)
    const result = await tryEntryOrder(candidateCid, candidateName)
    if (!result.error) {
      activeCid = candidateCid
      activeSymbolName = candidateName
      buyOrderResult = result
      console.log(`   Selected tradable symbol: ${activeSymbolName}`)
      break
    }

    attemptedSymbols.push({ symbol: candidateName, error: result.error })
    await sleep(1000)
  }

  if (!buyOrderResult) {
    ws.close()
    throw new Error(
      `Unable to place an entry order. Candidate errors: ${attemptedSymbols
        .map((item) => `${item.symbol} -> ${item.error}`)
        .join(' | ')}`,
    )
  }
  await sleep(3000)
  console.log('   Waiting for position on:', activeSymbolName)
  await waitForPositionQty(1, 'Observed long position')

  console.log('11. Flattening the position with CancelFlatReq...')
  send({
    CancelFlatReq: {
      RequestId: 9001,
      AccNumber: accountNumber,
      ContractsId: [activeCid],
      Action: 0, // FLAT
      Source: 1, // Manual
      Filter: 0, // ALL
      CancelExcludeOco: false,
    },
  })

  try {
    const flatResp = await waitFor((m: any) => {
      if (m.CancelFlatMsg && toNumber(m.CancelFlatMsg.RequestId ?? m.CancelFlatMsg.requestId) === 9001) {
        return m.CancelFlatMsg
      }
      return undefined
    })
    const items = flatResp.Items ?? flatResp.items ?? []
    const errors = flatResp.Errors ?? flatResp.errors ?? []
    console.log('   Flatten response items:', items.length, 'errors:', errors.length)
    if (errors.length > 0) {
      console.log('   Flatten errors:', JSON.stringify(errors, null, 2))
    }
  } catch {
    console.log('   (No CancelFlat response within 15s)')
  }

  await sleep(4000)
  await waitForPositionQty(0, 'Observed flat position')

  console.log('12. Requesting current-session trade reports...')
  try {
    send({
      AccountHistoricalSessionReq: {
        RequestId: 9101,
        Entity: 2, // Trades
      },
    })

    const sessionTradeResp = await waitFor((m: any) => {
      const resp = m.AccountHistoricalSessionResp
      if (!resp) return undefined
      if (toNumber(resp.RequestId ?? resp.requestId) !== 9101) return undefined
      return resp
    })

    const sessionTrades = sessionTradeResp.Trades ?? sessionTradeResp.trades ?? []
    const trackedSessionTrade = sessionTrades.find((trade: any) => {
      return (
        toNumber(trade.ContractId ?? trade.contractId) === activeCid &&
        toNumber(trade.EntryUtc ?? trade.entryUtc) >= tradeStartUtc
      )
    })

    console.log('   Session trade reports returned:', sessionTrades.length)
    if (trackedSessionTrade) {
      console.log('   Found matching session trade:', JSON.stringify(trackedSessionTrade, null, 2))
    } else {
      console.log('   No matching session trade found yet')
    }
  } catch {
    console.log('   (No session trade report received within 15s)')
  }

  ws.close()

  console.log('13. Polling Historical API for the newly closed trade...')
  let historicalTradeFound = false
  for (let attempt = 1; attempt <= HISTORICAL_POLL_ATTEMPTS; attempt++) {
    const trades = await fetchHistoricalTrades(
      reportToken,
      historicalHost,
      historicalAccount.accountReference,
    )
    const trackedTrade = findTrackedTrade(trades, {
      contractId: activeCid,
      minEntryUtc: tradeStartUtc,
      baselineTradeIds,
    })

    console.log(`   Attempt ${attempt}/${HISTORICAL_POLL_ATTEMPTS}: historical trades count=${trades.length}`)
    if (trackedTrade) {
      historicalTradeFound = true
      console.log('   Historical trade found:', JSON.stringify(trackedTrade, null, 2))
      break
    }

    if (attempt < HISTORICAL_POLL_ATTEMPTS) {
      await sleep(HISTORICAL_POLL_INTERVAL_MS)
    }
  }

  if (!historicalTradeFound) {
    console.log('   Historical API did not expose the new trade during the polling window.')
  }

  console.log('14. Fetching trades via debug script for a full dump...')
  const { execSync } = await import('child_process')
  execSync('npx tsx scripts/debug-dxfeed-trades.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DXFEED_ENVIRONMENT: String(ENVIRONMENT),
      DXFEED_HISTORY_LOOKBACK_DAYS: String(HISTORY_LOOKBACK_DAYS),
    },
  })

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
