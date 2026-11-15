// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()
const useSearchParams = vi.fn()
const usePathname = vi.fn()
const useRouter = vi.fn()
const useI18n = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => useRouter(),
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}))

vi.mock('@/locales/landing-client', () => ({
  useI18n: () => useI18n(),
}))

import { AccountDeletedNotice } from './account-deleted-notice'

describe('AccountDeletedNotice', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useRouter.mockReturnValue({ replace })
    usePathname.mockReturnValue('/')
    useI18n.mockReturnValue((key: string) => key)
  })

  it('renders complete copy and strips the query param', async () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams('account_deleted=complete'),
    )

    render(<AccountDeletedNotice />)

    expect(
      await screen.findByText('landing.accountDeleted.complete'),
    ).toBeTruthy()
    expect(
      screen.getByRole('status').getAttribute('data-account-deleted'),
    ).toBe('complete')
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/', { scroll: false })
    })
  })

  it('renders partial copy on mobile-friendly notice markup', async () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams('account_deleted=partial&utm=keep'),
    )
    usePathname.mockReturnValue('/fr')

    render(<AccountDeletedNotice />)

    expect(
      await screen.findByText('landing.accountDeleted.partial'),
    ).toBeTruthy()
    const status = screen.getByRole('status')
    expect(status.className).toMatch(/z-10/)
    expect(status.className).toMatch(/px-4/)
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/fr?utm=keep', { scroll: false })
    })
  })

  it('renders partial_unrecorded copy', async () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams('account_deleted=partial_unrecorded'),
    )

    render(<AccountDeletedNotice />)

    expect(
      await screen.findByText('landing.accountDeleted.partialUnrecorded'),
    ).toBeTruthy()
    expect(
      screen.getByRole('status').getAttribute('data-account-deleted'),
    ).toBe('partial_unrecorded')
  })

  it('renders nothing without the account_deleted param', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('utm=only'))
    const { container } = render(<AccountDeletedNotice />)
    expect(container.querySelector('[role="status"]')).toBeNull()
    expect(replace).not.toHaveBeenCalled()
  })
})
