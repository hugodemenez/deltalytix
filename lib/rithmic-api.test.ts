import { describe, expect, it } from 'vitest'
import {
  findRithmicBalanceForAccount,
  getPrimaryRithmicBalance,
  normalizeRithmicAccountBalance,
} from './rithmic-api'
import {
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
})
