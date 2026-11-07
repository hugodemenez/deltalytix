import { describe, expect, it } from 'vitest'
import { createInstrumentSnapshotSession } from './instrument-snapshot'

const ACCOUNT = 'LFE050'

describe('createInstrumentSnapshotSession 450/451/403', () => {
  it('completes when 451 evidence arrives before 403 with rp_code 0', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      netQuantity: 0,
      isSnapshot: true,
    })
    session.accountPnL(ACCOUNT, 0)
    session.snapshotResponse(['0'])
    const snapshot = session.finish(1_000)
    expect(snapshot.complete).toBe(true)
    expect(snapshot.evidenceAccountIds).toEqual([ACCOUNT])
    expect(snapshot.positions).toEqual([
      { accountId: ACCOUNT, symbol: 'MESZ6', exchange: undefined, netQuantity: 0 },
    ])
  })

  it('treats a missing isSnapshot flag as a snapshot row', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 2)
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      netQuantity: 2,
    })
    session.snapshotResponse(['0'])
    expect(session.finish(1).positions[0]?.netQuantity).toBe(2)
  })

  it('refuses no-data (rp_code 7) even with 451 evidence', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 0)
    session.snapshotResponse(['7'])
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.noDataAccountIds).toEqual([ACCOUNT])
    expect(snapshot.reason).toBe('no_data')
  })

  it('refuses a missing rp_code on 403', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 0)
    session.snapshotResponse(undefined)
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.reason).toBe('missing_rp_code')
  })

  it('refuses when 451 evidence is missing', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.snapshotResponse(['0'])
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.reason).toBe('no_evidence')
    expect(snapshot.evidenceAccountIds).toEqual([])
  })

  it('refuses a 450 with a missing net_quantity', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 0)
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      isSnapshot: true,
    })
    session.snapshotResponse(['0'])
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.malformedAccountIds).toEqual([ACCOUNT])
    expect(snapshot.reason).toBe('invalid_net_quantity')
  })

  it('refuses a 450 after 403', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 0)
    session.snapshotResponse(['0'])
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      netQuantity: 1,
      isSnapshot: true,
    })
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.lateInstrumentAccountIds).toEqual([ACCOUNT])
    expect(snapshot.reason).toBe('late_instrument_update')
  })

  it('rejects the account on template 75', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.reject()
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.rejectedAccountIds).toEqual([ACCOUNT])
  })

  it('does not treat a missing 451 account_id as evidence', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(undefined, 0)
    session.snapshotResponse(['0'])
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.reason).toBe('no_evidence')
  })

  it('refuses when 451 net_quantity disagrees with summed 450s', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 1)
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      netQuantity: 0,
      isSnapshot: true,
    })
    session.snapshotResponse(['0'])
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.reason).toBe('account_net_mismatch')
  })

  it('completes with no 450s when 451 net_quantity is explicitly 0', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 0)
    session.snapshotResponse(['0'])
    expect(session.finish(1).complete).toBe(true)
  })

  it('refuses conflicting duplicate 450 rows', () => {
    const session = createInstrumentSnapshotSession(ACCOUNT)
    session.accountPnL(ACCOUNT, 1)
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      netQuantity: 1,
      isSnapshot: true,
    })
    session.instrumentPnL({
      accountId: ACCOUNT,
      symbol: 'MESZ6',
      netQuantity: 2,
      isSnapshot: true,
    })
    session.snapshotResponse(['0'])
    const snapshot = session.finish(1)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.reason).toBe('conflicting_instrument_net')
  })
})
