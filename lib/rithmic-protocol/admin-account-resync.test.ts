import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { RITHMIC_PROTOCOL_TRADE_TAG } from '@/lib/trade-id-utils'

const tradeFindMany = vi.fn()
const tradeDeleteMany = vi.fn()
const fillCount = vi.fn()
const fillDeleteMany = vi.fn()
const connectionFindMany = vi.fn()
const connectionUpdateMany = vi.fn()
const moodDeleteMany = vi.fn()
const transaction = vi.fn()
const decryptConnectionToken = vi.fn()
const getRithmicProtocolTrades = vi.fn()

vi.mock('@/lib/api/server-actor', () => ({
  serverActor: (userId: string) => ({ userId }),
  trustedUserId: () => null,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    trade: {
      findMany: (...args: unknown[]) => tradeFindMany(...args),
      deleteMany: (...args: unknown[]) => tradeDeleteMany(...args),
    },
    rithmicProtocolFill: {
      count: (...args: unknown[]) => fillCount(...args),
      deleteMany: (...args: unknown[]) => fillDeleteMany(...args),
    },
    connection: {
      findMany: (...args: unknown[]) => connectionFindMany(...args),
      updateMany: (...args: unknown[]) => connectionUpdateMany(...args),
    },
    mood: {
      deleteMany: (...args: unknown[]) => moodDeleteMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}))
vi.mock('@/lib/connection-token-crypto', () => ({
  decryptConnectionToken: (...args: unknown[]) => decryptConnectionToken(...args),
}))
vi.mock(
  '@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions',
  () => ({
    getRithmicProtocolTrades: (...args: unknown[]) =>
      getRithmicProtocolTrades(...args),
  }),
)

import {
  deleteAccountProtocolTradesAndFills,
  resyncRithmicProtocolAccount,
} from './admin-account-resync'

const USER = 'user-1'
const ACCOUNT = 'LFE050-I7X0S9B3-TEST001'
const OTHER = 'LFE050-OTHER'

describe('admin account resync scoping', () => {
  beforeEach(() => {
    tradeFindMany.mockReset().mockResolvedValue([{ pnl: 10 }, { pnl: 5 }])
    fillCount.mockReset().mockResolvedValue(4)
    tradeDeleteMany.mockReset().mockResolvedValue({ count: 2 })
    fillDeleteMany.mockReset().mockResolvedValue({ count: 4 })
    connectionUpdateMany.mockReset()
    moodDeleteMany.mockReset()
    transaction.mockReset().mockImplementation(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    )
    decryptConnectionToken.mockReset().mockReturnValue(
      JSON.stringify({
        username: 'trader',
        password: 'secret',
        systemName: 'Rithmic',
        accountIds: [ACCOUNT, OTHER],
      }),
    )
    connectionFindMany.mockReset().mockResolvedValue([
      {
        id: 'conn-1',
        token: 'enc-token',
        accounts: [{ number: ACCOUNT }, { number: OTHER }],
      },
    ])
    getRithmicProtocolTrades.mockReset().mockResolvedValue({
      savedCount: 2,
      tradesCount: 2,
    })
  })

  it('deletes only this user and account protocol trades/fills', async () => {
    await deleteAccountProtocolTradesAndFills(USER, ACCOUNT)
    expect(tradeDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: USER,
        accountNumber: ACCOUNT,
        tags: { has: RITHMIC_PROTOCOL_TRADE_TAG },
      },
    })
    expect(fillDeleteMany).toHaveBeenCalledWith({
      where: { userId: USER, accountNumber: ACCOUNT },
    })
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
  })

  it('dryRun reports counts and does not delete or sync', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      dryRun: true,
      actor: 'admin-1',
    })
    expect(result).toMatchObject({
      dryRun: true,
      userId: USER,
      accountNumber: ACCOUNT,
      before: { tradeCount: 2, pnl: 15, fillCount: 4 },
      wouldDelete: { tradeCount: 2, pnl: 15, fillCount: 4 },
    })
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(fillDeleteMany).not.toHaveBeenCalled()
    expect(getRithmicProtocolTrades).not.toHaveBeenCalled()
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
  })

  it('rebuilds only the requested account via the existing sync helper', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: ACCOUNT,
      actor: 'cron',
    })
    expect(result.error).toBeUndefined()
    expect(result.deleted).toEqual({ trades: 2, fills: 4 })
    expect(getRithmicProtocolTrades).toHaveBeenCalledTimes(1)
    const [, options] = getRithmicProtocolTrades.mock.calls[0] as [
      string,
      { accountNumbers?: string[]; skipConnectionStamp?: boolean },
    ]
    expect(options.accountNumbers).toEqual([ACCOUNT])
    expect(options.skipConnectionStamp).toBe(true)
    expect(moodDeleteMany).not.toHaveBeenCalled()
    expect(connectionUpdateMany).not.toHaveBeenCalled()
  })

  it('does not sync when the account is not on the stored connection', async () => {
    const result = await resyncRithmicProtocolAccount({
      userId: USER,
      accountNumber: 'NOT-THIS-ACCOUNT',
    })
    expect(result.error).toBe('ACCOUNT_NOT_ON_CONNECTION')
    expect(tradeDeleteMany).not.toHaveBeenCalled()
    expect(getRithmicProtocolTrades).not.toHaveBeenCalled()
  })
})
