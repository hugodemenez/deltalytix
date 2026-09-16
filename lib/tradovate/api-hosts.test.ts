import { describe, expect, it } from 'vitest'
import {
  TRADOVATE_FALLBACK_HOSTS,
  hostsAfterAuthResponse,
  normalizeHostContext,
  parseTradovateApiHosts,
  readApiHostsFromAuthResponse,
  resolveTradovateHostname,
  tradovateRestBaseUrl,
  tradovateTradingRestBaseUrl,
  tradovateWebSocketBaseUrl,
} from './api-hosts'

const ORG_HOSTS = {
  live: 'live.tradovateapi.com',
  demo: 'org-demo.example.ninjatrader.com',
  mdLive: 'md.tradovateapi.com',
  mdDemo: 'org-md-demo.example.ninjatrader.com',
  replay: 'replay.tradovateapi.com',
  reportingLive: 'org-reporting-live.example.ninjatrader.com',
  reportingDemo: 'org-reporting-demo.example.ninjatrader.com',
}

describe('parseTradovateApiHosts', () => {
  it('treats apiHosts as optional and returns null when omitted', () => {
    expect(parseTradovateApiHosts(undefined)).toBeNull()
    expect(parseTradovateApiHosts(null)).toBeNull()
    expect(parseTradovateApiHosts({})).toBeNull()
    expect(readApiHostsFromAuthResponse({ accessToken: 'tok' })).toBeNull()
  })

  it('keeps string hosts and ignores unknown non-string fields', () => {
    const parsed = parseTradovateApiHosts({
      demo: 'org-demo.example.ninjatrader.com',
      live: 'live.tradovateapi.com',
      adminDemo: 'org-admin-demo.example.ninjatrader.com',
      ntInternal: 'tooling.example.ninjatrader.com',
      nested: { nope: true },
      empty: '  ',
      ported: 'https://org-demo.example.ninjatrader.com:8443/v1',
    })
    expect(parsed).toEqual({
      demo: 'org-demo.example.ninjatrader.com',
      live: 'live.tradovateapi.com',
      adminDemo: 'org-admin-demo.example.ninjatrader.com',
      ntInternal: 'tooling.example.ninjatrader.com',
      ported: 'org-demo.example.ninjatrader.com:8443',
    })
  })
})

describe('resolveTradovateHostname (pick host by purpose)', () => {
  it('routes demo/live trading, market data, replay, and reporting', () => {
    expect(resolveTradovateHostname('trading', 'demo', ORG_HOSTS)).toBe(
      ORG_HOSTS.demo,
    )
    expect(resolveTradovateHostname('trading', 'live', ORG_HOSTS)).toBe(
      ORG_HOSTS.live,
    )
    expect(resolveTradovateHostname('marketData', 'demo', ORG_HOSTS)).toBe(
      ORG_HOSTS.mdDemo,
    )
    expect(resolveTradovateHostname('marketData', 'live', ORG_HOSTS)).toBe(
      ORG_HOSTS.mdLive,
    )
    expect(resolveTradovateHostname('replay', 'demo', ORG_HOSTS)).toBe(
      ORG_HOSTS.replay,
    )
    expect(resolveTradovateHostname('reporting', 'demo', ORG_HOSTS)).toBe(
      ORG_HOSTS.reportingDemo,
    )
    expect(resolveTradovateHostname('reporting', 'live', ORG_HOSTS)).toBe(
      ORG_HOSTS.reportingLive,
    )
  })

  it('treats the returned live host as authoritative', () => {
    const dedicatedLive = {
      ...ORG_HOSTS,
      live: 'org-live.example.ninjatrader.com',
    }
    expect(resolveTradovateHostname('trading', 'live', dedicatedLive)).toBe(
      'org-live.example.ninjatrader.com',
    )
    expect(tradovateRestBaseUrl('trading', 'live', dedicatedLive)).toBe(
      'https://org-live.example.ninjatrader.com',
    )
  })

  it('adds https:// for REST and wss:// for WebSockets', () => {
    expect(tradovateRestBaseUrl('trading', 'demo', ORG_HOSTS)).toBe(
      `https://${ORG_HOSTS.demo}`,
    )
    expect(tradovateWebSocketBaseUrl('trading', 'demo', ORG_HOSTS)).toBe(
      `wss://${ORG_HOSTS.demo}`,
    )
    expect(tradovateWebSocketBaseUrl('marketData', 'live', ORG_HOSTS)).toBe(
      `wss://${ORG_HOSTS.mdLive}`,
    )
  })
})

describe('fallback when apiHosts is missing', () => {
  it('uses the historical shared demo/live map', () => {
    expect(resolveTradovateHostname('trading', 'demo')).toBe(
      TRADOVATE_FALLBACK_HOSTS.demo,
    )
    expect(resolveTradovateHostname('trading', 'live', null)).toBe(
      TRADOVATE_FALLBACK_HOSTS.live,
    )
    expect(tradovateTradingRestBaseUrl('demo')).toBe(
      `https://${TRADOVATE_FALLBACK_HOSTS.demo}`,
    )
    expect(tradovateTradingRestBaseUrl('live')).toBe(
      `https://${TRADOVATE_FALLBACK_HOSTS.live}`,
    )
    expect(resolveTradovateHostname('marketData', 'demo')).toBe(
      TRADOVATE_FALLBACK_HOSTS.mdDemo,
    )
    expect(resolveTradovateHostname('marketData', 'live')).toBe(
      TRADOVATE_FALLBACK_HOSTS.mdLive,
    )
  })

  it('falls back per-field when only some hosts are returned', () => {
    const partial = { demo: 'org-demo.example.ninjatrader.com' }
    expect(resolveTradovateHostname('trading', 'demo', partial)).toBe(
      'org-demo.example.ninjatrader.com',
    )
    expect(resolveTradovateHostname('trading', 'live', partial)).toBe(
      TRADOVATE_FALLBACK_HOSTS.live,
    )
    expect(resolveTradovateHostname('reporting', 'demo', partial)).toBe(
      TRADOVATE_FALLBACK_HOSTS.demo,
    )
  })

  it('accepts a host context object or a bare environment string', () => {
    expect(
      tradovateTradingRestBaseUrl({
        environment: 'demo',
        apiHosts: ORG_HOSTS,
      }),
    ).toBe(`https://${ORG_HOSTS.demo}`)
    expect(normalizeHostContext('live')).toEqual({
      environment: 'live',
      apiHosts: null,
    })
  })
})

describe('re-read hosts on every authenticate/renew', () => {
  it('replaces stored hosts when the renew body includes apiHosts', () => {
    const previous = { demo: 'old-demo.example.ninjatrader.com' }
    const renewed = hostsAfterAuthResponse(previous, {
      accessToken: 'new-token',
      expirationTime: '2026-10-03T18:00:00.000Z',
      apiHosts: ORG_HOSTS,
    })
    expect(renewed).toEqual(ORG_HOSTS)
    expect(renewed?.demo).toBe(ORG_HOSTS.demo)
    expect(resolveTradovateHostname('trading', 'demo', renewed)).toBe(
      ORG_HOSTS.demo,
    )
  })

  it('keeps previous hosts when apiHosts is omitted (errors, MFA)', () => {
    const previous = { demo: 'org-demo.example.ninjatrader.com' }
    expect(
      hostsAfterAuthResponse(previous, {
        errorText: 'MFA required',
        'p-ticket': 'ticket',
      }),
    ).toEqual(previous)
    expect(hostsAfterAuthResponse(previous, { errorText: 'invalid token' })).toEqual(
      previous,
    )
    expect(hostsAfterAuthResponse(null, { accessToken: 'tok' })).toBeNull()
  })

  it('reads apiHosts from OAuth snake_case token responses too', () => {
    expect(
      readApiHostsFromAuthResponse({
        access_token: 'tok',
        api_hosts: { demo: 'org-demo.example.ninjatrader.com' },
      }),
    ).toEqual({ demo: 'org-demo.example.ninjatrader.com' })
  })
})
