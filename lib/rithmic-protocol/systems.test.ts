import { afterEach, describe, expect, it } from 'vitest'
import {
  RITHMIC_PROTOCOL_GATEWAYS,
  gatewayUri,
  getFallbackSystems,
  listSelectableRithmicProtocolGateways,
  resolveGateway,
} from './systems'

const uriFor = (gatewayIdOrUri?: string) =>
  gatewayUri(resolveGateway(gatewayIdOrUri))

const ENV_KEYS = [
  'RITHMIC_PROTOCOL_URI',
  'RITHMIC_PROTOCOL_GATEWAY',
  'RITHMIC_PROTOCOL_ALLOW_TEST_GATEWAY',
] as const

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

describe('rithmic protocol connect points', () => {
  it('builds wss URIs on 443 for every published connect point', () => {
    for (const gateway of RITHMIC_PROTOCOL_GATEWAYS) {
      expect(uriFor(gateway.id)).toBe(`wss://${gateway.host}:443`)
    }
  })

  it('resolves a gateway from an id, a bare host, or any scheme Rithmic documents', () => {
    expect(resolveGateway('nyc').host).toBe('rprotocol-nyc.rithmic.com')
    expect(resolveGateway('rprotocol-jp.rithmic.com').id).toBe('jp')
    expect(resolveGateway('https://rprotocol-de.rithmic.com').id).toBe('de')
    expect(resolveGateway('wss://rituz00100.rithmic.com:443').id).toBe('test')
  })

  it('defaults to Core (Chicago) and ignores unknown stored hosts', () => {
    expect(resolveGateway().id).toBe('core')
    expect(resolveGateway('wss://not-rithmic.example.com:443').id).toBe('core')
  })

  it('lets RITHMIC_PROTOCOL_GATEWAY and RITHMIC_PROTOCOL_URI move the default', () => {
    process.env.RITHMIC_PROTOCOL_GATEWAY = 'test'
    expect(uriFor()).toBe('wss://rituz00100.rithmic.com:443')

    process.env.RITHMIC_PROTOCOL_URI = 'wss://localhost:8443'
    expect(uriFor()).toBe('wss://localhost:8443')
  })

  it('offers UAT only when allowed, production regions always', () => {
    process.env.RITHMIC_PROTOCOL_ALLOW_TEST_GATEWAY = 'false'
    const productionOnly = listSelectableRithmicProtocolGateways()
    expect(productionOnly.some((gateway) => gateway.id === 'test')).toBe(false)
    expect(productionOnly.some((gateway) => gateway.id === 'core')).toBe(true)

    process.env.RITHMIC_PROTOCOL_ALLOW_TEST_GATEWAY = 'true'
    expect(
      listSelectableRithmicProtocolGateways().some(
        (gateway) => gateway.id === 'test',
      ),
    ).toBe(true)
  })

  it('falls back to Rithmic Test systems only on the UAT connect point', () => {
    expect(getFallbackSystems('test')).toEqual(['Rithmic Test'])
    expect(getFallbackSystems('core')).toContain('Rithmic 01')
  })
})
