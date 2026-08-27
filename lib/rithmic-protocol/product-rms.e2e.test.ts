/**
 * Live R | Protocol Product RMS check.
 *
 * Skipped unless both `RITHMIC_PROTOCOL_E2E_USERNAME` and
 * `RITHMIC_PROTOCOL_E2E_PASSWORD` are set. Default connect point is Rithmic
 * Test (`test` → wss://rituz00100.rithmic.com:443). Prefer a UAT login; do
 * not commit credentials.
 *
 * Run: `bun run test:e2e:rithmic`
 */
import { describe, expect, it } from 'vitest'
import {
  fetchFillsForAccounts,
  fetchProductCommissionRates,
} from './client'
import { buildTradesFromRithmicFills, normalizeInstrument } from './fills-to-trades'
import { lookupCommissionFillRate } from './commission-rates'
import { gatewayUri, RITHMIC_PROTOCOL_GATEWAYS } from './systems'

const username = process.env.RITHMIC_PROTOCOL_E2E_USERNAME?.trim() ?? ''
const password = process.env.RITHMIC_PROTOCOL_E2E_PASSWORD?.trim() ?? ''
const hasLiveCredentials = Boolean(username && password)

function e2eGatewayUri(): string {
  const raw = process.env.RITHMIC_PROTOCOL_E2E_GATEWAY?.trim() || 'test'
  if (/^wss?:\/\//i.test(raw)) return raw
  const known = RITHMIC_PROTOCOL_GATEWAYS.find(
    (gateway) => gateway.id === raw.toLowerCase(),
  )
  if (!known) {
    throw new Error(
      `Unknown RITHMIC_PROTOCOL_E2E_GATEWAY=${raw}; use a known id (e.g. test) or a wss:// URI`,
    )
  }
  return gatewayUri(known)
}

function e2eSystemName(): string {
  return process.env.RITHMIC_PROTOCOL_E2E_SYSTEM_NAME?.trim() || 'Rithmic Test'
}

it.skipIf(hasLiveCredentials)(
  'does not open a Rithmic socket without RITHMIC_PROTOCOL_E2E_USERNAME and PASSWORD',
  () => {
    expect(hasLiveCredentials).toBe(false)
  },
)

describe.skipIf(!hasLiveCredentials)(
  'Rithmic Protocol Product RMS (live gateway)',
  () => {
    it('logs in and fetches commission_fill_rate rows', async () => {
      const pinnedAccount = process.env.RITHMIC_PROTOCOL_E2E_ACCOUNT_ID?.trim()
      const result = await fetchProductCommissionRates({
        gatewayUri: e2eGatewayUri(),
        systemName: e2eSystemName(),
        username,
        password,
        accountIds: pinnedAccount ? [pinnedAccount] : [],
      })

      expect(result.accounts.length).toBeGreaterThan(0)

      for (const [key, rate] of result.rates) {
        expect(key).toMatch(/^.+\|[A-Z0-9._-]+$/)
        expect(Number.isFinite(rate)).toBe(true)
      }

      for (const row of result.rows) {
        expect(row.accountId.length).toBeGreaterThan(0)
        expect(row.productCode).toBe(row.productCode.toUpperCase())
        expect(Number.isFinite(row.commissionFillRate)).toBe(true)
        expect(lookupCommissionFillRate(result.rates, row.accountId, row.productCode)).toBe(
          row.commissionFillRate,
        )
      }

      if (result.rates.size === 0) {
        console.warn(
          '[RITHMIC-PROTOCOL-E2E] Login succeeded but Product RMS returned no commission_fill_rate rows. The plant may omit bit 64, or this account has no product RMS.',
        )
      } else {
        console.log(
          `[RITHMIC-PROTOCOL-E2E] Product RMS: ${result.rates.size} rate(s) across ${result.accounts.length} account(s)`,
        )
      }
    })

    it('applies RMS rates onto closed trades from a short fill window', async () => {
      const pinnedAccount = process.env.RITHMIC_PROTOCOL_E2E_ACCOUNT_ID?.trim()
      const { fills, commissionRates } = await fetchFillsForAccounts({
        gatewayUri: e2eGatewayUri(),
        systemName: e2eSystemName(),
        username,
        password,
        accountIds: pinnedAccount ? [pinnedAccount] : [],
        lookbackDays: 2,
      })

      const { trades } = buildTradesFromRithmicFills(
        fills,
        'e2e-user',
        new Map(),
        commissionRates,
      )

      for (const trade of trades) {
        expect(Number.isFinite(trade.commission)).toBe(true)
        expect(trade.commission).toBeGreaterThanOrEqual(0)
      }

      const priced = trades.filter((trade) => {
        const accountId = String(trade.accountNumber ?? '')
        const instrument = normalizeInstrument(String(trade.instrument ?? ''))
        return lookupCommissionFillRate(commissionRates, accountId, instrument) > 0
      })
      if (priced.length > 0) {
        expect(priced.some((trade) => trade.commission > 0)).toBe(true)
      } else {
        console.warn(
          `[RITHMIC-PROTOCOL-E2E] No closed trades with a positive RMS rate in the 2-day window (fills=${fills.length}, trades=${trades.length}, rates=${commissionRates.size})`,
        )
      }
    })
  },
)
