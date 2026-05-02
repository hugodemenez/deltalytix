/**
 * Finnhub API client
 * Docs: https://finnhub.io/docs/api
 * Free tier: 60 req/min, WebSocket for real-time trades
 *
 * Получить ключ: https://finnhub.io/register
 * Добавить в .env.local: FINNHUB_API_KEY=your_key
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const API_KEY = process.env.FINNHUB_API_KEY ?? ''

export interface FinnhubQuote {
  c: number  // current price
  d: number  // change
  dp: number // change percent
  h: number  // high
  l: number  // low
  o: number  // open
  pc: number // previous close
  t: number  // timestamp
}

export interface NormalizedQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  prevClose: number
  timestamp: number
}

/**
 * Получить котировку одного символа
 */
export async function getQuote(symbol: string): Promise<NormalizedQuote | null> {
  if (!API_KEY) {
    console.warn('[Finnhub] FINNHUB_API_KEY не задан — котировки недоступны')
    return null
  }

  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`,
      { next: { revalidate: 15 } } // Next.js ISR: обновление каждые 15 сек
    )

    if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`)

    const data: FinnhubQuote = await res.json()

    // Finnhub возвращает c=0 для неизвестных символов
    if (data.c === 0) return null

    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
      timestamp: data.t,
    }
  } catch (err) {
    console.error(`[Finnhub] Ошибка для ${symbol}:`, err)
    return null
  }
}

/**
 * Получить котировки нескольких символов параллельно
 */
export async function getQuotes(
  symbols: string[]
): Promise<Record<string, NormalizedQuote>> {
  const unique = [...new Set(symbols)].filter(Boolean)
  if (!unique.length) return {}

  const results = await Promise.allSettled(
    unique.map((s) => getQuote(s))
  )

  return unique.reduce<Record<string, NormalizedQuote>>((acc, symbol, i) => {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value) {
      acc[symbol] = r.value
    }
    return acc
  }, {})
}

/**
 * Маппинг futures-символов Deltalytix → Finnhub
 * Futures торгуются на CME — используем CFD-тикеры или continuous contracts
 */
export const FUTURES_SYMBOL_MAP: Record<string, string> = {
  // Micro/Mini E-mini
  'MES': 'ES1!',   // Micro E-mini S&P 500
  'ES':  'ES1!',   // E-mini S&P 500
  'MNQ': 'NQ1!',   // Micro E-mini Nasdaq
  'NQ':  'NQ1!',   // E-mini Nasdaq
  'MYM': 'YM1!',   // Micro E-mini Dow
  'YM':  'YM1!',   // E-mini Dow
  'M2K': 'RTY1!',  // Micro E-mini Russell 2000
  'RTY': 'RTY1!',  // E-mini Russell 2000
  // Energy
  'MCL': 'CL1!',   // Micro Crude Oil
  'CL':  'CL1!',   // Crude Oil
  'NG':  'NG1!',   // Natural Gas
  // Metals
  'MGC': 'GC1!',   // Micro Gold
  'GC':  'GC1!',   // Gold
  'SIL': 'SI1!',   // Silver
  'SI':  'SI1!',   // Silver Full
  // FX Futures
  '6E':  '6E1!',   // Euro FX
  '6J':  '6J1!',   // Japanese Yen
  '6B':  '6B1!',   // British Pound
  // Rates
  'ZN':  'ZN1!',   // 10-Year T-Note
  'ZB':  'ZB1!',   // 30-Year T-Bond
}

/**
 * Привести символ из Trade к Finnhub-совместимому
 */
export function resolveSymbol(rawSymbol: string): string {
  const base = rawSymbol.replace(/\d{2}$/, '').toUpperCase()
  return FUTURES_SYMBOL_MAP[base] ?? rawSymbol.toUpperCase()
}
