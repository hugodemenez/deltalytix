/**
 * GET /api/quotes?symbols=ES,NQ,MNQ
 *
 * Returns live Finnhub quotes for a list of futures symbols.
 * Protected: requires valid Supabase session cookie.
 * Rate-limited: max 10 unique symbols per request.
 * Includes market-hours metadata in each quote.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getQuotes, resolveSymbol, getMarketStatus } from '@/lib/finnhub'

// Edge runtime — fastest cold start, compatible with Supabase SSR auth
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse + validate symbols ─────────────────────────────────────────────
  const { searchParams } = req.nextUrl
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) {
    return NextResponse.json(
      { error: 'Parameter `symbols` is required. Example: ?symbols=ES,NQ' },
      { status: 400 }
    )
  }

  const MAX_SYMBOLS = 10 // protect Finnhub free-tier rate limit (60 req/min)

  const rawSymbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS)

  if (!rawSymbols.length) {
    return NextResponse.json({ error: 'No valid symbols provided' }, { status: 400 })
  }

  const resolvedSymbols = rawSymbols.map(resolveSymbol)

  // ── Fetch quotes + market status in parallel ────────────────────────────
  const [quotes, marketStatus] = await Promise.all([
    getQuotes(resolvedSymbols),
    getMarketStatus(),
  ])

  // ── Build response ─────────────────────────────────────────────────────
  const result = rawSymbols.reduce<Record<string, unknown>>((acc, raw, i) => {
    const resolved = resolvedSymbols[i]
    const quote    = quotes[resolved]

    if (quote) {
      acc[raw] = {
        ...quote,
        symbol:       raw,
        marketStatus: marketStatus, // 'OPEN' | 'CLOSED' | 'UNKNOWN'
      }
    } else {
      // Symbol resolved but no data — likely market closed or unknown ticker
      acc[raw] = {
        symbol:       raw,
        price:        null,
        change:       null,
        changePercent: null,
        marketStatus: marketStatus,
      }
    }

    return acc
  }, {})

  return NextResponse.json(
    { quotes: result, marketStatus },
    {
      headers: {
        'Cache-Control':       'private, no-store',
        'X-RateLimit-Limit':   String(MAX_SYMBOLS),
        'X-RateLimit-Symbols': rawSymbols.join(','),
      },
    }
  )
}
