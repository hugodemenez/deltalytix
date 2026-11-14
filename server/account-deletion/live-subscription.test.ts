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
  TERMINAL_APP_SUBSCRIPTION_STATUSES,
  hasLiveAppSubscription,
  isTerminalSubscriptionStatus,
} from './live-subscription'

/** Observed prod Subscription.status values (Team/Business empty today). */
const PROD_STATUS_SAMPLES = [
  'TRIAL',
  'EXPIRED',
  'CANCELLED',
  'active',
  'ACTIVE',
  'SCHEDULED_CANCELLATION',
] as const

describe('isTerminalSubscriptionStatus', () => {
  it('denies only cancelled/canceled, expired, incomplete_expired (case-insensitive)', () => {
    expect([...TERMINAL_APP_SUBSCRIPTION_STATUSES]).toEqual([
      'cancelled',
      'canceled',
      'expired',
      'incomplete_expired',
    ])
    expect(isTerminalSubscriptionStatus('CANCELLED')).toBe(true)
    expect(isTerminalSubscriptionStatus('canceled')).toBe(true)
    expect(isTerminalSubscriptionStatus('EXPIRED')).toBe(true)
    expect(isTerminalSubscriptionStatus('incomplete_expired')).toBe(true)
    expect(isTerminalSubscriptionStatus('ACTIVE')).toBe(false)
    expect(isTerminalSubscriptionStatus('SCHEDULED_CANCELLATION')).toBe(false)
    expect(isTerminalSubscriptionStatus('TRIAL')).toBe(false)
    expect(isTerminalSubscriptionStatus('weird_unknown')).toBe(false)
  })
})

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

  it.each(PROD_STATUS_SAMPLES)(
    'classifies prod status %s correctly',
    async (status) => {
      subscriptionFindFirst.mockResolvedValue({ status })
      const live = await hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: ['user@example.com'],
      })
      expect(live).toBe(!isTerminalSubscriptionStatus(status))
    },
  )

  it('treats SCHEDULED_CANCELLATION as live (still billing)', async () => {
    subscriptionFindFirst.mockResolvedValue({
      status: 'SCHEDULED_CANCELLATION',
    })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(true)
  })

  it('returns false for CANCELLED / EXPIRED', async () => {
    subscriptionFindFirst.mockResolvedValue({ status: 'CANCELLED' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(false)

    subscriptionFindFirst.mockResolvedValue({ status: 'EXPIRED' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(false)
  })

  it('treats American canceled as terminal (not only cancelled)', async () => {
    subscriptionFindFirst.mockResolvedValue({ status: 'canceled' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(false)
  })

  it('returns true for a live TeamSubscription the user pays for', async () => {
    teamSubscriptionFindFirst.mockResolvedValue({ status: 'ACTIVE' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: ['payer@example.com'],
      }),
    ).resolves.toBe(true)
  })

  it('returns true for a live BusinessSubscription the user pays for', async () => {
    businessSubscriptionFindFirst.mockResolvedValue({ status: 'TRIAL' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(true)
  })

  it('treats unknown statuses as live (fail closed)', async () => {
    subscriptionFindFirst.mockResolvedValue({ status: 'PAYMENT_PENDING' })
    await expect(
      hasLiveAppSubscription({
        userIds: ['user-1'],
        emails: [],
      }),
    ).resolves.toBe(true)
  })
})
