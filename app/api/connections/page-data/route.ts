import { NextResponse } from 'next/server'
import { getConnectionsPageDataFresh } from '@/app/[locale]/dashboard/connections/data'

/**
 * JSON refresh endpoint for the Connections page client.
 *
 * Prefer this over the `getConnectionsPageData` server action for client-side
 * refreshes: Instant Navigations / HMR / mid-navigation redirects often return
 * HTML for action POSTs (`An unexpected response was received from the server`),
 * while a plain GET stays a stable JSON contract.
 */
export async function GET() {
  try {
    const data = await getConnectionsPageDataFresh()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[connections/page-data] failed to load', error)
    return NextResponse.json(
      { error: 'CONNECTIONS_LOAD_FAILED' },
      { status: 500 }
    )
  }
}
