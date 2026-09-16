/**
 * Redirect-aware fetch for NinjaTrader/Tradovate REST calls.
 *
 * After the 3 Oct 2026 dynamic-host changeover, a call to a stale host answers
 * `307` with a `Location` pointing at the org's host. NinjaTrader's own notice
 * warns that this is not a safety net: per the Fetch spec, `Authorization` is
 * stripped when a redirect crosses origins, so the automatic retry arrives
 * unauthenticated and fails with a `401`.
 *
 * So we follow redirects ourselves and re-attach the credentials — but only
 * towards a trusted NinjaTrader host, and we hand the new hostname back to the
 * caller so it can be persisted and skipped next time.
 *
 * @see https://docs.ninjatrader.com/api/dynamic-api-hosts
 */

import { isTrustedTradovateHost } from './api-hosts'

const MAX_REDIRECTS = 3
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export type TradovateFetchOptions = {
  /** Called with `host` (or `host:port`) each time a redirect moves us hosts. */
  onHostRedirect?: (hostname: string) => void
  /** Included in warnings so a redirect is attributable to a call site. */
  label?: string
}

/**
 * Drop-in `fetch` for Tradovate REST. Same contract as `fetch`, except that
 * cross-host redirects to a trusted NT host keep their headers. A redirect to
 * anything else is not followed: the 3xx is returned as-is rather than leaking
 * the access token.
 */
export async function tradovateFetch(
  input: string,
  init: RequestInit = {},
  options: TradovateFetchOptions = {},
): Promise<Response> {
  let url = input
  let method = (init.method ?? 'GET').toUpperCase()
  let body = init.body
  const headers = new Headers(init.headers as HeadersInit | undefined)

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      ...init,
      method,
      body,
      headers,
      redirect: 'manual',
    })

    // Browsers answer `redirect: 'manual'` with an opaque response we cannot
    // read. Nothing in this repo calls Tradovate from the browser today, but
    // fall back to the built-in follow rather than returning a blank response.
    if (response.type === 'opaqueredirect' || response.status === 0) {
      return fetch(url, { ...init, method, body, headers, redirect: 'follow' })
    }

    if (!REDIRECT_STATUSES.has(response.status)) return response

    const location = response.headers.get('location')
    if (!location) return response

    let target: URL
    try {
      target = new URL(location, url)
    } catch {
      return response
    }

    const movedHosts = target.host !== new URL(url).host
    if (movedHosts) {
      if (!isTrustedTradovateHost(target.hostname)) {
        console.warn('[tradovate] refusing redirect to untrusted host', {
          label: options.label,
          from: new URL(url).host,
          to: target.host,
        })
        return response
      }
      options.onHostRedirect?.(target.host)
    }

    // 303 always becomes GET; 301/302 historically do too for non-GET methods.
    if (
      response.status === 303 ||
      (method !== 'GET' && method !== 'HEAD' &&
        (response.status === 301 || response.status === 302))
    ) {
      method = 'GET'
      body = undefined
      headers.delete('Content-Type')
    }

    url = target.toString()
  }

  // Redirect loop: make the last hop without following further.
  return fetch(url, { ...init, method, body, headers, redirect: 'manual' })
}
