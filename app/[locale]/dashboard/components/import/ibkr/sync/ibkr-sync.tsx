'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useI18n } from '@/locales/client'
import { IbkrConnectForm } from './ibkr-connect-form'
import { IbkrCredentialsManager } from './ibkr-credentials-manager'

interface IbkrSyncProps {
  /** When false, open on the connect form instead of the saved-connections list. */
  initialShowAccountsManager?: boolean
  onConnected?: () => void
  /** Accepted for PlatformConfig customComponent compatibility; unused here. */
  setIsOpen?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void)
}

export function IbkrSync({
  initialShowAccountsManager = true,
  onConnected,
  setIsOpen: _setIsOpen,
}: IbkrSyncProps = {}) {
  const t = useI18n()

  if (!initialShowAccountsManager) {
    return <IbkrConnectForm onConnected={() => onConnected?.()} />
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-0 sm:gap-6 sm:p-1">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-xl font-normal tracking-tight md:text-2xl">
          {t('ibkrSync.title')}
        </h2>
        <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
          {t('ibkrSync.description')}
        </p>
      </div>
      <IbkrCredentialsManager />
    </div>
  )
}
