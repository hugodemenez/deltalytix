/**
 * GET /api/economic-events?from=YYYY-MM-DD&to=YYYY-MM-DD&currency=USD
 *
 * Returns Finnhub economic calendar events for the given date range.
 * Protected: requires valid Supabase session.
 * Results are cached server-side for 1 hour (Finnhub free tier allows this).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getEconomicEvents, groupEventsByDate } from '@/lib/economic-calendar'

export const runtime = 'edge'

// Validate YYYY-MM-DD
function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

export async function GET(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl
  const from     = searchParams.get('from')     ?? ''
  const to       = searchParams.get('to')       ?? ''
  const currency = searchParams.get('currency') ?? 'USD'

  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json(
      { error: 'Params `from` and `to` are required in YYYY-MM-DD format.' },
      { status: 400 }
    )
  }

  // Max range: 90 days to stay within Finnhub limits
  const diffDays = (Date.parse(to) - Date.parse(from)) / 86_400_000
  if (diffDays < 0 || diffDays > 90) {
    return NextResponse.json(
      { error: 'Date range must be between 0 and 90 days.' },
      { status: 400 }
    )
  }

  // ── Fetch + group ─────────────────────────────────────────────────────────
  const currencies = currency.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
  const events     = await getEconomicEvents(from, to)
  const byDate     = groupEventsByDate(events, currencies)

  return NextResponse.json(
    { events, byDate, from, to, currency: currencies },
    {
      headers: {
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=600',
      },
    }
  )
}
