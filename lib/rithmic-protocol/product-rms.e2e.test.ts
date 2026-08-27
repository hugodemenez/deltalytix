/**
 * Live R | Protocol Product RMS check.
 *
 * Skipped unless both `RITHMIC_PROTOCOL_E2E_USERNAME` and
 * `RITHMIC_PROTOCOL_E2E_PASSWORD` are set. Defaults match the reconnect UI:
 * Core (Chicago) + Rithmic Paper Trading. Do not commit credentials.
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

function e2eLog(message: string) {
  console.log(`[RITHMIC-PROTOCOL-E2E] ${message}`)
}

function e2eGatewayUri(): string {
  const raw = process.env.RITHMIC_PROTOCOL_E2E_GATEWAY?.trim() || 'core'
  if (/^wss?:\/\//i.test(raw)) return raw
  const known = RITHMIC_PROTOCOL_GATEWAYS.find(
    (gateway) => gateway.id === raw.toLowerCase(),
  )
  if (!known) {
    throw new Error(
      `Unknown RITHMIC_PROTOCOL_E2E_GATEWAY=${raw}; use a known id (e.g. core) or a wss:// URI`,
    )
  }
  return gatewayUri(known)
}

function e2eSystemName(): string {
  return process.env.RITHMIC_PROTOCOL_E2E_SYSTEM_NAME?.trim() || 'Rithmic Paper Trading'
}

it.skipIf(hasLiveCredentials)(
  'does not open a Rithmic socket without RITHMIC_PROTOCOL_E2E_USERNAME and PASSWORD',
  () => {
    e2eLog('skip: username/password secrets are not set')
    expect(hasLiveCredentials).toBe(false)
  },
)

describe.skipIf(!hasLiveCredentials)(
  'Rithmic Protocol Product RMS (live gateway)',
  () => {
    it('logs in and fetches commission_fill_rate rows', async () => {
      const gateway = e2eGatewayUri()
      const systemName = e2eSystemName()
      const pinnedAccount = process.env.RITHMIC_PROTOCOL_E2E_ACCOUNT_ID?.trim()
      e2eLog(`login gateway=${gateway} system=${systemName} pin=${pinnedAccount || '(all accounts)'}`)

      const result = await fetchProductCommissionRates({
        gatewayUri: gateway,
        systemName,
        username,
        password,
        accountIds: pinnedAccount ? [pinnedAccount] : [],
      })

      e2eLog(
        `login ok unique_user_id=${result.uniqueUserId ?? '(none)'} accounts=${result.accounts.length} rms_rows=${result.rows.length} rates=${result.rates.size}`,
      )
      for (const account of result.accounts) {
        e2eLog(
          `account id=${account.accountId} name=${account.accountName ?? '(none)'} fcm=${account.fcmId ?? '(none)'} ib=${account.ibId ?? '(none)'}`,
        )
      }
      for (const row of result.rows) {
        e2eLog(
          `rms account=${row.accountId} product=${row.productCode} commission_fill_rate=${row.commissionFillRate}`,
        )
      }

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
        e2eLog(
          'warn: Product RMS returned no commission_fill_rate rows (plant may omit bit 64, or this account has no product RMS)',
        )
      }
    })

    it('applies RMS rates onto closed trades from a short fill window', async () => {
      const gateway = e2eGatewayUri()
      const systemName = e2eSystemName()
      const pinnedAccount = process.env.RITHMIC_PROTOCOL_E2E_ACCOUNT_ID?.trim()
      e2eLog(`fills gateway=${gateway} system=${systemName} lookbackDays=2 pin=${pinnedAccount || '(all accounts)'}`)

      const { fills, commissionRates } = await fetchFillsForAccounts({
        gatewayUri: gateway,
        systemName,
        username,
        password,
        accountIds: pinnedAccount ? [pinnedAccount] : [],
        lookbackDays: 2,
      })

      const { trades, openSkipped } = buildTradesFromRithmicFills(
        fills,
        'e2e-user',
        new Map(),
        commissionRates,
      )

      const withCommission = trades.filter((trade) => trade.commission > 0)
      e2eLog(
        `fills=${fills.length} closed_trades=${trades.length} open_skipped=${openSkipped} rates=${commissionRates.size} trades_with_commission=${withCommission.length}`,
      )
      for (const [key, rate] of [...commissionRates.entries()].sort()) {
        e2eLog(`rate ${key}=${rate}`)
      }
      for (const trade of trades.slice(0, 20)) {
        e2eLog(
          `trade account=${trade.accountNumber} instrument=${trade.instrument} qty=${trade.quantity} pnl=${trade.pnl} commission=${trade.commission}`,
        )
      }
      if (trades.length > 20) {
        e2eLog(`… ${trades.length - 20} more closed trade(s) omitted`)
      }

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
        e2eLog(
          'warn: no closed trades with a positive RMS rate in the 2-day window',
        )
      }
    })
  },
)
