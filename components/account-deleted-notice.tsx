'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/locales/landing-client'
import {
  ACCOUNT_DELETED_PARAM,
  parseAccountDeletedParam,
  type AccountDeletedStatus,
} from '@/lib/account-deleted-notice'

function AccountDeletedNoticeInner() {
  const t = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<AccountDeletedStatus | null>(null)

  useEffect(() => {
    const parsed = parseAccountDeletedParam(
      searchParams.get(ACCOUNT_DELETED_PARAM),
    )
    if (!parsed) return
    setStatus(parsed)

    const next = new URLSearchParams(searchParams.toString())
    next.delete(ACCOUNT_DELETED_PARAM)
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  if (!status) return null

  const message =
    status === 'partial'
      ? t('landing.accountDeleted.partial')
      : t('landing.accountDeleted.complete')

  return (
    <div
      role="status"
      className="mx-auto w-full max-w-3xl px-4 pt-4"
      data-account-deleted={status}
    >
      <p className="rounded-[4px] border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#171717] dark:border-border dark:bg-card dark:text-foreground">
        {message}
      </p>
    </div>
  )
}

/** Landing notice driven by `?account_deleted=complete|partial`, then strips the param. */
export function AccountDeletedNotice() {
  return (
    <Suspense fallback={null}>
      <AccountDeletedNoticeInner />
    </Suspense>
  )
}
