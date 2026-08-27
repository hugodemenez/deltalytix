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
  fetchAvailableSystems,
  fetchProductCommissionRates,
  sanitizeRithmicSecret,
} from './client'
import { lookupCommissionFillRate } from './commission-rates'
import { gatewayUri, RITHMIC_PROTOCOL_GATEWAYS } from './systems'

const username = sanitizeRithmicSecret(process.env.RITHMIC_PROTOCOL_E2E_USERNAME ?? '')
const password = sanitizeRithmicSecret(process.env.RITHMIC_PROTOCOL_E2E_PASSWORD ?? '')
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
      e2eLog(
        `runtime node=${process.version} force_ipv4=${process.env.RITHMIC_PROTOCOL_FORCE_IPV4 ?? 'off'}`,
      )
      e2eLog(
        `login gateway=${gateway} system=${systemName} pin=${pinnedAccount || '(all accounts)'} ` +
          `user_len=${username.length} password_len=${password.length}`,
      )

      e2eLog('probe RequestRithmicSystemInfo on a short-lived socket (Rithmic sequence)')
      const systems = await fetchAvailableSystems(gateway)
      e2eLog(`available systems: ${systems.join(', ') || '(none)'}`)
      if (!systems.includes(systemName)) {
        e2eLog(`warn: ${systemName} is not in the system-info list`)
      }

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
      for (const row of result.rows) {
        expect(row.productCode).toBe(row.productCode.toUpperCase())
        expect(Number.isFinite(row.commissionFillRate)).toBe(true)
        expect(
          lookupCommissionFillRate(
            result.rates,
            row.accountId,
            row.productCode,
          ),
        ).toBe(row.commissionFillRate)
      }
      if (result.rates.size === 0) {
        e2eLog(
          'warn: Product RMS returned no commission_fill_rate rows (plant may omit bit 64, or this account has no product RMS)',
        )
      }
    })
  },
)
