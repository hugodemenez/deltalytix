import { describe, expect, it } from 'vitest'
import {
  buildStripItems,
  chipAccountCountLabel,
  accountDisplayName,
  isMaskedAccount,
  isStandaloneAccount,
  mapConnectionsAccounts,
  removeConnectionsAccount,
  restoreMovedAccountGroup,
} from './connections-strip-items'
import type {
  ConnectionsPageAccount,
  ConnectionsPageConnection,
} from '@/app/[locale]/dashboard/connections/types'

function account(
  overrides: Partial<ConnectionsPageAccount> & Pick<ConnectionsPageAccount, 'id' | 'number'>
): ConnectionsPageAccount {
  return {
    propfirm: '',
    connectionId: null,
    groupId: null,
    createdAt: new Date('2026-01-01'),
    tradeCount: 0,
    lastTradeDate: null,
    ...overrides,
  }
}

function connection(
  overrides: Partial<ConnectionsPageConnection> &
    Pick<ConnectionsPageConnection, 'id' | 'displayName'>
): ConnectionsPageConnection {
  return {
    service: 'tradovate',
    status: 'connected',
    loginLabel: null,
    authError: null,
    accounts: [],
    externalId: 'ext',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastSyncedAt: new Date('2026-01-01'),
    tokenExpiresAt: null,
    dailySyncTime: null,
    ...overrides,
  } as ConnectionsPageConnection
}

describe('buildStripItems', () => {
  it('uses connection display names, not account numbers', () => {
    const items = buildStripItems(
      {
        connections: [
          connection({
            id: 'c1',
            displayName: 'Tradovate',
            accounts: [account({ id: 'a1', number: 'DEMENEZ-123' })],
          }),
        ],
        standaloneAccounts: [],
      },
      'Standalone'
    )
    expect(items).toHaveLength(1)
    expect(items[0].displayName).toBe('Tradovate')
    expect(items[0].displayName).not.toContain('DEMENEZ')
  })

  it('groups every standalone account onto one Standalone chip', () => {
    const items = buildStripItems(
      {
        connections: [],
        standaloneAccounts: [
          account({ id: 'a1', number: 'DEMENEZ-1', propfirm: 'Demo Firm' }),
          account({ id: 'a2', number: 'DEMENEZ-2', propfirm: '' }),
          account({ id: 'a3', number: 'OTHER', propfirm: 'Demo Firm' }),
        ],
      },
      'Standalone'
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'standalone',
      id: 'standalone',
      displayName: 'Standalone',
      status: 'offline',
    })
    expect(items[0].accounts.map((a) => a.number)).toEqual([
      'DEMENEZ-1',
      'DEMENEZ-2',
      'OTHER',
    ])
  })

  it('omits the Standalone chip when there are no standalone accounts', () => {
    const items = buildStripItems(
      {
        connections: [
          connection({ id: 'c1', displayName: 'IG' }),
        ],
        standaloneAccounts: [],
      },
      'Standalone'
    )
    expect(items.map((item) => item.kind)).toEqual(['connection'])
  })
})

describe('chipAccountCountLabel', () => {
  const t = (
    key: 'connections.accountCount.one' | 'connections.accountCount.other',
    params: { count: number }
  ) => `${key}:${params.count}`

  it('never returns an account number', () => {
    expect(chipAccountCountLabel(0, t)).toBeNull()
    expect(chipAccountCountLabel(1, t)).toBeNull()
    expect(chipAccountCountLabel(3, t)).toBe(
      'connections.accountCount.other:3'
    )
  })

  it('returns the number only when numericOnly is set', () => {
    expect(chipAccountCountLabel(20, t, { numericOnly: true })).toBe('20')
    expect(chipAccountCountLabel(1, t, { numericOnly: true })).toBeNull()
  })
})

describe('account action helpers', () => {
  it('returns a trimmed account name only when one exists', () => {
    expect(accountDisplayName({ propfirm: 'Local Simulation' })).toBe(
      'Local Simulation'
    )
    expect(accountDisplayName({ propfirm: '  ' })).toBeNull()
    expect(accountDisplayName({ propfirm: '' })).toBeNull()
    expect(accountDisplayName({ propfirm: null })).toBeNull()
  })

  it('treats a null connection as standalone and a linked one as synced', () => {
    expect(isStandaloneAccount({ connectionId: null })).toBe(true)
    expect(isStandaloneAccount({ connectionId: 'conn-1' })).toBe(false)
  })

  it('masks only when the account is in the hidden group', () => {
    expect(isMaskedAccount({ groupId: 'hidden' }, 'hidden')).toBe(true)
    expect(isMaskedAccount({ groupId: 'other' }, 'hidden')).toBe(false)
    expect(isMaskedAccount({ groupId: 'hidden' }, null)).toBe(false)
    expect(isMaskedAccount({ groupId: null }, 'hidden')).toBe(false)
  })

  it('maps and removes accounts across connections and standalone', () => {
    const data = {
      connections: [
        connection({
          id: 'c1',
          displayName: 'Tradovate',
          accounts: [
            account({ id: 'a1', number: 'ONE', groupId: null }),
            account({ id: 'a2', number: 'TWO', connectionId: 'c1' }),
          ],
        }),
      ],
      standaloneAccounts: [account({ id: 'a3', number: 'THREE' })],
    }

    const mapped = mapConnectionsAccounts(data, (item) =>
      item.id === 'a1' ? { ...item, groupId: 'hidden' } : item
    )
    expect(mapped.connections[0].accounts[0].groupId).toBe('hidden')
    expect(mapped.standaloneAccounts[0].number).toBe('THREE')

    const removed = removeConnectionsAccount(data, 'a3')
    expect(removed.standaloneAccounts).toEqual([])
    expect(removed.connections[0].accounts.map((item) => item.id)).toEqual([
      'a1',
      'a2',
    ])
  })
})

describe('restoreMovedAccountGroup', () => {
  const accountA = {
    id: 'a1',
    number: 'ONE',
    groupId: 'hidden',
  }
  const accountB = {
    id: 'a2',
    number: 'TWO',
    groupId: 'visible',
  }

  it('moves the account back to the previous group and restores groupId', () => {
    const restored = restoreMovedAccountGroup(
      [accountA, accountB],
      [
        { id: 'hidden', accounts: [accountA] },
        { id: 'visible', accounts: [accountB] },
      ],
      'a1',
      'visible'
    )

    expect(restored.accounts.find((item) => item.id === 'a1')?.groupId).toBe(
      'visible'
    )
    expect(restored.groups.find((group) => group.id === 'hidden')?.accounts).toEqual(
      []
    )
    expect(
      restored.groups.find((group) => group.id === 'visible')?.accounts.map(
        (item) => item.id
      )
    ).toEqual(['a2', 'a1'])
  })

  it('unmasks by clearing groupId and removing the account from every group', () => {
    const restored = restoreMovedAccountGroup(
      [accountA, accountB],
      [
        { id: 'hidden', accounts: [accountA] },
        { id: 'visible', accounts: [accountB] },
      ],
      'a1',
      null
    )

    expect(restored.accounts.find((item) => item.id === 'a1')?.groupId).toBeNull()
    expect(
      restored.groups.flatMap((group) => group.accounts.map((item) => item.id))
    ).toEqual(['a2'])
  })

  it('leaves store snapshots unchanged when the account is not present', () => {
    const accounts = [accountB]
    const groups = [{ id: 'visible', accounts: [accountB] }]
    const restored = restoreMovedAccountGroup(accounts, groups, 'a1', null)
    expect(restored.accounts).toBe(accounts)
    expect(restored.groups).toBe(groups)
  })
})
