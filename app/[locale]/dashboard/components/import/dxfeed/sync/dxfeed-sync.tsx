'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useI18n } from '@/locales/client'
import { DxFeedCredentialsManager } from './dxfeed-credentials-manager'
import { DxFeedConnectForm } from './dxfeed-connect-form'

interface DxFeedSyncProps {
  /** When false, open on the connect form instead of the saved-accounts list. */
  initialShowAccountsManager?: boolean
  /** Prefill login email when reconnecting. */
  initialEmail?: string
  /** Prefill prop firm (name or id) when reconnecting. */
  initialPropFirmName?: string
  onConnected?: () => void
  /** Accepted for PlatformConfig customComponent compatibility; unused here. */
  setIsOpen?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void)
}

export function DxFeedSync({
  initialShowAccountsManager = true,
  initialEmail,
  initialPropFirmName,
  onConnected,
  setIsOpen: _setIsOpen,
}: DxFeedSyncProps = {}) {
  const t = useI18n()

  if (!initialShowAccountsManager) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <DxFeedConnectForm
            onConnected={onConnected}
            initialEmail={initialEmail}
            initialPropFirmName={initialPropFirmName}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-0 sm:gap-6 sm:p-1">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-xl font-normal tracking-tight md:text-2xl">
          {t('dxfeedSync.title')}
        </h2>
        <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
          {t('dxfeedSync.description')}
        </p>
      </div>
      <DxFeedCredentialsManager />
    </div>
  )
}
