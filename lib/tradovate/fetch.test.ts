import { afterEach, describe, expect, it, vi } from 'vitest'
import { tradovateFetch } from './fetch'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

type Call = { url: string; init: RequestInit }

/** Replay a scripted list of responses, recording what each hop was sent. */
function stubFetch(responses: Response[]): Call[] {
  const calls: Call[] = []
  let hop = 0
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const response = responses[hop++]
    if (!response) throw new Error('unexpected extra fetch')
    return response
  }) as unknown as typeof fetch
  return calls
}

function redirect(status: number, location: string): Response {
  return new Response(null, { status, headers: { location } })
}

function authOf(call: Call): string | null {
  return new Headers(call.init.headers as HeadersInit).get('authorization')
}

describe('tradovateFetch', () => {
  it('re-attaches credentials across a 307 to a migrated host', async () => {
    // The header that plain `fetch` would drop is exactly the one NT needs.
    const calls = stubFetch([
      redirect(307, 'https://org-1.tradovateapi.com/v1/fillPair/list'),
      new Response('[]', { status: 200 }),
    ])
    const seen: string[] = []

    const response = await tradovateFetch(
      'https://demo.tradovateapi.com/v1/fillPair/list',
      { headers: { Authorization: 'Bearer tok' } },
      { onHostRedirect: (host) => seen.push(host) },
    )

    expect(response.status).toBe(200)
    expect(calls).toHaveLength(2)
    expect(calls[1].url).toBe('https://org-1.tradovateapi.com/v1/fillPair/list')
    expect(authOf(calls[1])).toBe('Bearer tok')
    expect(seen).toEqual(['org-1.tradovateapi.com'])
  })

  it('preserves method and body on a 307 so a token exchange survives', async () => {
    const calls = stubFetch([
      redirect(307, 'https://org-1.tradovateapi.com/auth/oauthtoken'),
      new Response('{}', { status: 200 }),
    ])

    await tradovateFetch('https://demo.tradovateapi.com/auth/oauthtoken', {
      method: 'POST',
      body: 'grant_type=authorization_code',
      headers: { Authorization: 'Basic secret' },
    })

    expect(calls[1].init.method).toBe('POST')
    expect(calls[1].init.body).toBe('grant_type=authorization_code')
    expect(authOf(calls[1])).toBe('Basic secret')
  })

  it('refuses to follow a redirect off NinjaTrader, leaking nothing', async () => {
    const calls = stubFetch([redirect(307, 'https://evil.test/v1/user/list')])
    const seen: string[] = []

    const response = await tradovateFetch(
      'https://demo.tradovateapi.com/v1/user/list',
      { headers: { Authorization: 'Bearer tok' } },
      { onHostRedirect: (host) => seen.push(host) },
    )

    expect(response.status).toBe(307)
    expect(calls).toHaveLength(1)
    expect(seen).toEqual([])
  })

  it('passes a normal response straight through', async () => {
    const calls = stubFetch([new Response('{}', { status: 200 })])

    const response = await tradovateFetch('https://demo.tradovateapi.com/v1/user/list')

    expect(response.status).toBe(200)
    expect(calls).toHaveLength(1)
    expect(calls[0].init.redirect).toBe('manual')
  })

  it('stops following after a bounded number of hops', async () => {
    stubFetch([
      redirect(307, 'https://org-1.tradovateapi.com/a'),
      redirect(307, 'https://org-2.tradovateapi.com/a'),
      redirect(307, 'https://org-3.tradovateapi.com/a'),
      redirect(307, 'https://org-4.tradovateapi.com/a'),
    ])

    const response = await tradovateFetch('https://demo.tradovateapi.com/a')

    expect(response.status).toBe(307)
  })
})
