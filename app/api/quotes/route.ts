/**
 * GET /api/quotes?symbols=ES,NQ,MNQ
 *
 * Возвращает котировки для списка символов через Finnhub.
 * Используется клиентскими хуками для unrealized P&L.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getQuotes, resolveSymbol } from '@/lib/finnhub'

export const runtime = 'edge'
export const revalidate = 15 // секунд

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) {
    return NextResponse.json(
      { error: 'Параметр symbols обязателен. Пример: ?symbols=ES,NQ' },
      { status: 400 }
    )
  }

  const rawSymbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20) // защита от слишком большого запроса

  const resolvedSymbols = rawSymbols.map(resolveSymbol)

  const quotes = await getQuotes(resolvedSymbols)

  // Возвращаем с исходными символами для удобства клиента
  const result = rawSymbols.reduce<Record<string, unknown>>((acc, raw, i) => {
    const resolved = resolvedSymbols[i]
    if (quotes[resolved]) {
      acc[raw] = { ...quotes[resolved], symbol: raw }
    }
    return acc
  }, {})

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
    },
  })
}
