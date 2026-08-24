import { NextResponse, type NextRequest } from 'next/server'
import { absoluteUrl, scopeNames } from '@/lib/agent-discovery/metadata'

/**
 * API status endpoint advertised by `/.well-known/api-catalog`. Kept JSON-only
 * so an agent can confirm reachability and find the description document
 * without parsing HTML.
 */
export async function GET(request: NextRequest) {
    return NextResponse.json(
        {
            message: 'Hello, world!',
            status: 'ok',
            documentation_url: absoluteUrl('/docs/api', request),
            openapi_url: absoluteUrl('/openapi.json', request),
            scopes_supported: scopeNames(),
        },
        {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        },
    )
}
