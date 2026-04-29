/**
 * Finnhub API client
 * Docs: https://finnhub.io/docs/api
 * Free tier: 60 req/min, 15-sec quote delay
 *
 * Get your key: https://finnhub.io/register
 * Add to .env.local: FINNHUB_API_KEY=your_key
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const API_KEY      = process.env.FINNHUB_API_KEY ?? ''

export type MarketStatus = 'OPEN' | 'CLOSED' | 'UNKNOWN'

export interface FinnhubQuote {
  c:  number  // current price
  d:  number  // change
  dp: number  // change percent
  h:  number  // high
  l:  number  // low
  o:  number  // open
  pc: number  // previous close
  t:  number  // unix timestamp
}

export interface NormalizedQuote {
  symbol:        string
  price:         number
  change:        number
  changePercent: number
  high:          number
  low:           number
  open:          number
  prevClose:     number
  timestamp:     number
}

// ─── Quote fetching ───────────────────────────────────────────────────────────

export async function getQuote(symbol: string): Promise<NormalizedQuote | null> {
  if (!API_KEY) {
    console.warn('[Finnhub] FINNHUB_API_KEY not set — quotes unavailable')
    return null
  }

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`,
      { next: { revalidate: 15 } }
    )

    if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`)

    const data: FinnhubQuote = await res.json()

    // Finnhub returns c=0 for unknown/closed symbols
    if (data.c === 0) return null

    return {
      symbol,
      price:         data.c,
      change:        data.d,
      changePercent: data.dp,
      high:          data.h,
      low:           data.l,
      open:          data.o,
      prevClose:     data.pc,
      timestamp:     data.t,
    }
  } catch (err) {
    console.error(`[Finnhub] Error for ${symbol}:`, err)
    return null
  }
}

export async function getQuotes(
  symbols: string[]
): Promise<Record<string, NormalizedQuote>> {
  const unique = [...new Set(symbols)].filter(Boolean)
  if (!unique.length) return {}

  const results = await Promise.allSettled(unique.map(getQuote))

  return unique.reduce<Record<string, NormalizedQuote>>((acc, symbol, i) => {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value) acc[symbol] = r.value
    return acc
  }, {})
}

// ─── Market status ──────────────────────────────────────────────────────────

interface FinnhubMarketStatus {
  exchange: string
  holiday:  string | null
  isOpen:   boolean
  session:  string | null
  timezone: string
  t:        number
}

/**
 * Get US market open/closed status (CME regular hours).
 * Falls back to UNKNOWN if API key missing or request fails.
 */
export async function getMarketStatus(): Promise<MarketStatus> {
  if (!API_KEY) return 'UNKNOWN'

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/stock/market-status?exchange=US&token=${API_KEY}`,
      { next: { revalidate: 60 } } // cache for 1 min
    )
    if (!res.ok) return 'UNKNOWN'

    const data: FinnhubMarketStatus = await res.json()
    return data.isOpen ? 'OPEN' : 'CLOSED'
  } catch {
    return 'UNKNOWN'
  }
}

// ─── Symbol mapping ───────────────────────────────────────────────────────────

/**
 * Maps Deltalytix instrument names → Finnhub continuous contract symbols.
 * Strips expiry suffix (e.g. ESM25 → ES → ES1!).
 */
export const FUTURES_SYMBOL_MAP: Record<string, string> = {
  // Equity index
  MES:  'ES1!',   // Micro E-mini S&P 500
  ES:   'ES1!',   // E-mini S&P 500
  MNQ:  'NQ1!',   // Micro E-mini Nasdaq-100
  NQ:   'NQ1!',   // E-mini Nasdaq-100
  MYM:  'YM1!',   // Micro E-mini Dow
  YM:   'YM1!',   // E-mini Dow
  M2K:  'RTY1!',  // Micro E-mini Russell 2000
  RTY:  'RTY1!',  // E-mini Russell 2000
  // Energy
  MCL:  'CL1!',   // Micro Crude Oil
  CL:   'CL1!',   // Crude Oil WTI
  NG:   'NG1!',   // Natural Gas
  RB:   'RB1!',   // RBOB Gasoline
  HO:   'HO1!',   // Heating Oil
  // Metals
  MGC:  'GC1!',   // Micro Gold
  GC:   'GC1!',   // Gold
  MGS:  'SI1!',   // Micro Silver (alias)
  SIL:  'SI1!',   // Silver
  SI:   'SI1!',   // Silver Full
  HG:   'HG1!',   // Copper
  PL:   'PL1!',   // Platinum
  // FX Futures
  '6E': '6E1!',   // Euro FX
  '6J': '6J1!',   // Japanese Yen
  '6B': '6B1!',   // British Pound
  '6A': '6A1!',   // Australian Dollar
  '6C': '6C1!',   // Canadian Dollar
  '6S': '6S1!',   // Swiss Franc
  // Rates
  ZN:   'ZN1!',   // 10-Year T-Note
  ZB:   'ZB1!',   // 30-Year T-Bond
  ZF:   'ZF1!',   // 5-Year T-Note
  ZT:   'ZT1!',   // 2-Year T-Note
  // Grains
  ZC:   'ZC1!',   // Corn
  ZW:   'ZW1!',   // Wheat
  ZS:   'ZS1!',   // Soybeans
  // Crypto futures
  BTC:  'BTCUSDT', // Bitcoin perpetual (Binance)
  ETH:  'ETHUSDT', // Ethereum perpetual
}

/**
 * Strip expiry suffix (ESM25 → ES) then look up the map.
 * Falls back to the uppercased raw symbol if not found.
 */
export function resolveSymbol(rawSymbol: string): string {
  // Remove trailing month+year codes: ESM25 → ES, NQZ4 → NQ
  const base = rawSymbol.replace(/[A-Z]\d{2}$/, '').toUpperCase()
  return FUTURES_SYMBOL_MAP[base] ?? rawSymbol.toUpperCase()
}
