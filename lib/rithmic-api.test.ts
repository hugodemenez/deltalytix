import { describe, expect, it } from 'vitest'
import {
  findRithmicBalanceForAccount,
  getPrimaryRithmicBalance,
  isRithmicConnectionService,
  isRithmicLinkedAccount,
  normalizeRithmicAccountBalance,
  putRithmicBalance,
  resolveDisplayedRithmicBalances,
  type RithmicAccountBalance,
  type RithmicAccountBalanceInput,
} from './rithmic-api'
import {
  getLinkedAccountsForCredentialSet,
  getLinkedRithmicAccountNumbers,
  hasAnyRithmicAllAccountsMode,
  type RithmicCredentialSet,
} from './rithmic-storage'

describe('normalizeRithmicAccountBalance', () => {
  it('accepts snake_case account fields', () => {
    const normalized = normalizeRithmicAccountBalance({
      account_id: ' APEX-123 ',
      account_balance: '15000.5',
      cash_on_hand: 100,
    })
    expect(normalized?.account_id).toBe('APEX-123')
    expect(normalized?.account_balance).toBe(15000.5)
    expect(normalized?.cash_on_hand).toBe(100)
  })

  it('accepts camelCase account fields from the balances API', () => {
    const normalized = normalizeRithmicAccountBalance({
      account_id: '',
      accountId: 'APEX-456',
      accountBalance: 20000,
      cashOnHand: 50,
      marginBalance: 19950,
    })
    expect(normalized?.account_id).toBe('APEX-456')
    expect(normalized?.account_balance).toBe(20000)
    expect(normalized?.cash_on_hand).toBe(50)
    expect(normalized?.margin_balance).toBe(19950)
  })

  it('maps day_pnl and keeps extra classic /balances fields', () => {
    const normalized = normalizeRithmicAccountBalance({
      account_id: 'APEX-789',
      account_balance: 100,
      day_pnl: '12.5',
      net_liquidity: 99,
    } as RithmicAccountBalanceInput & { net_liquidity: number })
    expect(normalized?.day_pnl).toBe(12.5)
    expect(
      (normalized as RithmicAccountBalance & { net_liquidity?: number })
        ?.net_liquidity
    ).toBe(99)
  })

  it('drops balances without an account id', () => {
    expect(
      normalizeRithmicAccountBalance({
        account_id: '   ',
        account_balance: 1,
      })
    ).toBeNull()
  })
})

describe('findRithmicBalanceForAccount', () => {
  const balances = {
    'APEX-123': {
      account_id: 'APEX-123',
      account_balance: 1000,
    },
  }

  it('matches exact account numbers', () => {
    expect(findRithmicBalanceForAccount('APEX-123', balances)?.account_balance).toBe(
      1000
    )
  })

  it('matches trimmed and case-insensitive account numbers', () => {
    expect(
      findRithmicBalanceForAccount(' apex-123 ', balances)?.account_balance
    ).toBe(1000)
  })

  it('returns null when no match exists', () => {
    expect(findRithmicBalanceForAccount('OTHER', balances)).toBeNull()
  })
})

describe('getPrimaryRithmicBalance', () => {
  it('prefers account_balance over cash_on_hand', () => {
    expect(
      getPrimaryRithmicBalance({
        account_id: 'A',
        account_balance: 10,
        cash_on_hand: 5,
      })
    ).toBe(10)
  })
})

describe('rithmic linked account helpers', () => {
  const credentials = {
    username: 'user',
    password: 'pass',
    server_type: 'Rithmic Paper Trading',
    location: 'Chicago Area',
  }

  it('collects selectedAccounts across credential sets', () => {
    const sets: RithmicCredentialSet[] = [
      {
        id: 'a',
        credentials,
        selectedAccounts: ['A1', 'A2'],
        lastSyncTime: new Date().toISOString(),
      },
      {
        id: 'b',
        credentials,
        selectedAccounts: ['A2', 'B1'],
        lastSyncTime: new Date().toISOString(),
        allAccounts: true,
      },
    ]
    expect(getLinkedRithmicAccountNumbers(sets).sort()).toEqual([
      'A1',
      'A2',
      'B1',
    ])
    expect(hasAnyRithmicAllAccountsMode(sets)).toBe(true)
  })

  it('returns empty linked accounts for legacy allAccounts saves', () => {
    const sets: RithmicCredentialSet[] = [
      {
        id: 'a',
        credentials,
        selectedAccounts: [],
        lastSyncTime: new Date().toISOString(),
        allAccounts: true,
      },
    ]
    expect(getLinkedRithmicAccountNumbers(sets)).toEqual([])
    expect(hasAnyRithmicAllAccountsMode(sets)).toBe(true)
  })

  it('prefers linkedAccounts over selectedAccounts', () => {
    expect(
      getLinkedAccountsForCredentialSet({
        selectedAccounts: ['A1'],
        linkedAccounts: ['B1', 'B2'],
      })
    ).toEqual(['B1', 'B2'])
  })
})

describe('putRithmicBalance', () => {
  it('keys by lowercase id so mixed-case duplicates collapse', () => {
    const merged: Record<string, RithmicAccountBalance> = {}
    putRithmicBalance(merged, { account_id: 'APEX-123', account_balance: 1 })
    putRithmicBalance(merged, { account_id: 'apex-123', account_balance: 2 })
    expect(Object.keys(merged)).toEqual(['apex-123'])
    expect(merged['apex-123'].account_balance).toBe(1)
    expect(findRithmicBalanceForAccount('APEX-123', merged)?.account_balance).toBe(
      1
    )
  })
})

describe('isRithmicLinkedAccount', () => {
  it('matches linked ids case-insensitively', () => {
    expect(
      isRithmicLinkedAccount('apex-123', {}, ['APEX-123'])
    ).toBe(true)
  })

  it('treats rithmic and rithmic-protocol as Rithmic services', () => {
    expect(isRithmicConnectionService('rithmic')).toBe(true)
    expect(isRithmicConnectionService('rithmic-protocol')).toBe(true)
    expect(isRithmicConnectionService('dxfeed')).toBe(false)
  })
})

describe('resolveDisplayedRithmicBalances', () => {
  const previous = { 'APEX-1': { account_id: 'APEX-1', account_balance: 10 } }
  const merged = { 'APEX-2': { account_id: 'APEX-2', account_balance: 20 } }

  it('clears stale balances when no source remains', () => {
    expect(
      resolveDisplayedRithmicBalances({
        hasAnySource: false,
        anySucceeded: false,
        merged,
        previous,
      })
    ).toEqual({})
  })

  it('keeps the previous map when a source still exists and the fetch failed', () => {
    expect(
      resolveDisplayedRithmicBalances({
        hasAnySource: true,
        anySucceeded: false,
        merged,
        previous,
      })
    ).toBe(previous)
  })

  it('uses the merged map after a successful fetch', () => {
    expect(
      resolveDisplayedRithmicBalances({
        hasAnySource: true,
        anySucceeded: true,
        merged,
        previous,
      })
    ).toBe(merged)
  })
})
