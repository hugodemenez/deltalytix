import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const {
  subscriptionFindFirst,
  teamSubscriptionFindFirst,
  businessSubscriptionFindFirst,
} = vi.hoisted(() => ({
  subscriptionFindFirst: vi.fn(),
  teamSubscriptionFindFirst: vi.fn(),
  businessSubscriptionFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: { findFirst: subscriptionFindFirst },
    teamSubscription: { findFirst: teamSubscriptionFindFirst },
    businessSubscription: { findFirst: businessSubscriptionFindFirst },
  },
}))

import {
  LIVE_APP_SUBSCRIPTION_STATUSES,
  hasLiveAppSubscription,
} from './live-subscription'

describe('hasLiveAppSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscriptionFindFirst.mockResolvedValue(null)
    teamSubscriptionFindFirst.mockResolvedValue(null)
    businessSubscriptionFindFirst.mockResolvedValue(null)
  })

  it('returns false when no identities are provided', async () => {
    await expect(
      hasLiveAppSubscription({ userIds: [], emails: [] }),
    ).resolves.toBe(false)
    expect(subscriptionFindFirst).not.toHaveBeenCalled()
  })

  it('treats only active / trialing / past_due statuses as live', () => {
    expect([...LIVE_APP_SUBSCRIPTION_STATUSES]).toEqual([
      'ACTIVE',
      'active',
      'TRIAL',
      'trialing',
      'PAST_DUE',
      'past_due',
    ])
  })

  it('returns true for a live personal Subscription', async () => {
    subscriptionFindFirst.mockResolvedValue({ id: 'sub-1' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: ['user@example.com'],
      }),
    ).resolves.toBe(true)
    expect(subscriptionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              status: {
                in: [...LIVE_APP_SUBSCRIPTION_STATUSES],
              },
            },
          ]),
        }),
      }),
    )
  })

  it('returns true for a live TeamSubscription the user pays for', async () => {
    teamSubscriptionFindFirst.mockResolvedValue({ id: 'team-sub-1' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: ['payer@example.com'],
      }),
    ).resolves.toBe(true)
  })

  it('returns true for a live BusinessSubscription the user pays for', async () => {
    businessSubscriptionFindFirst.mockResolvedValue({ id: 'biz-sub-1' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(true)
  })

  it('returns false when only canceled or expired rows would match', async () => {
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: ['user@example.com'],
      }),
    ).resolves.toBe(false)
    expect(subscriptionFindFirst.mock.calls[0]?.[0]?.where?.AND?.[1]).toEqual({
      status: { in: [...LIVE_APP_SUBSCRIPTION_STATUSES] },
    })
  })
})
