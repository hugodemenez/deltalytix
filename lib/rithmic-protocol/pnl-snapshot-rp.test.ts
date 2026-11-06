import { describe, expect, it } from 'vitest'
import {
  classifyPnLSnapshotRpCode,
  protocolAccountPlantIds,
} from './pnl-snapshot-rp'

describe('classifyPnLSnapshotRpCode', () => {
  it('treats empty or 0 as a completed book', () => {
    expect(classifyPnLSnapshotRpCode(undefined)).toBe('ok')
    expect(classifyPnLSnapshotRpCode([])).toBe('ok')
    expect(classifyPnLSnapshotRpCode(['0'])).toBe('ok')
  })

  it('does not read no-data as flat', () => {
    expect(classifyPnLSnapshotRpCode(['7'])).toBe('no_data')
    expect(classifyPnLSnapshotRpCode(['7', 'no data'])).toBe('no_data')
  })

  it('classifies other rp codes as errors', () => {
    expect(classifyPnLSnapshotRpCode(['1'])).toBe('error')
  })
})

describe('protocolAccountPlantIds', () => {
  it('honors per-account FCM/IB over the login-level ids', () => {
    expect(
      protocolAccountPlantIds(
        'acct-2',
        [
          { accountId: 'acct-1', fcmId: 'FCM-A', ibId: 'IB-A' },
          { accountId: 'acct-2', fcmId: 'FCM-B', ibId: 'IB-B' },
        ],
        { fcmId: 'LOGIN-FCM', ibId: 'LOGIN-IB' },
      ),
    ).toEqual({ fcmId: 'FCM-B', ibId: 'IB-B' })
  })

  it('falls back to login-level ids when the account has no override', () => {
    expect(
      protocolAccountPlantIds('acct-3', [], {
        fcmId: 'LOGIN-FCM',
        ibId: 'LOGIN-IB',
      }),
    ).toEqual({ fcmId: 'LOGIN-FCM', ibId: 'LOGIN-IB' })
  })
})
