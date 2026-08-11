'use client'

import {
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useI18n } from '@/locales/client'
import { ThemeAwareLogo } from '@/components/monochrome-logo'
import { RithmicProtocolCredentialsManager } from './rithmic-protocol-credentials-manager'
import { RithmicProtocolConnectForm } from './rithmic-protocol-connect-form'

function RithmicTrademarkFooter() {
  const t = useI18n()

  const notices = (
    <>
      <p>{t('import.type.copyright.rithmic')}</p>
      <p>{t('import.type.copyright.protocol')}</p>
      <p>{t('import.type.copyright.platform')}</p>
      <p>{t('import.type.copyright.omne')}</p>
      <p>{t('import.type.copyright.omneSoftware')}</p>
    </>
  )

  return (
    <div className="shrink-0 border-t border-black/10 pt-3 dark:border-white/10">
      <div className="mb-1.5 flex items-center gap-2.5 opacity-50 sm:mb-2 sm:gap-4 sm:opacity-70">
        <ThemeAwareLogo
          path="/logos/monochrome/trading-platform-by-rithmic-black.png"
          darkPath="/logos/monochrome/trading-platform-by-rithmic-white.png"
          alt="Trading Platform by Rithmic"
          width={164}
          height={35}
          className="h-3.5 w-auto sm:h-6"
        />
        <ThemeAwareLogo
          path="/logos/monochrome/powered-by-omne-black.png"
          darkPath="/logos/monochrome/powered-by-omne-white.png"
          alt="Powered by OMNE"
          width={141}
          height={15}
          className="h-2 w-auto sm:h-3"
        />
      </div>
      <details className="sm:hidden">
        <summary className="cursor-pointer list-none text-[10px] leading-relaxed text-black/40 marker:content-none dark:text-white/40 [&::-webkit-details-marker]:hidden">
          {t('rithmicProtocolSync.trademark.summary')}
        </summary>
        <div className="mt-1.5 space-y-1 text-[10px] leading-snug text-black/35 dark:text-white/35">
          {notices}
        </div>
      </details>
      <div className="hidden space-y-1.5 text-xs leading-relaxed text-black/45 dark:text-white/45 sm:block">
        {notices}
      </div>
    </div>
  )
}

interface RithmicProtocolSyncProps {
  /** When false, open on the connect form instead of the saved-accounts list. */
  initialShowAccountsManager?: boolean
  /** Prefill username when reconnecting. */
  initialUsername?: string
  onConnected?: () => void
  /** Accepted for PlatformConfig customComponent compatibility; unused here. */
  setIsOpen?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void)
}

export function RithmicProtocolSync({
  initialShowAccountsManager = true,
  initialUsername,
  onConnected,
  setIsOpen: _setIsOpen,
}: RithmicProtocolSyncProps = {}) {
  const t = useI18n()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {!initialShowAccountsManager ? (
          <RithmicProtocolConnectForm
            onConnected={onConnected}
            initialUsername={initialUsername}
          />
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="text-xl font-normal tracking-tight md:text-2xl">
                {t('rithmicProtocolSync.title')}
              </h2>
              <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
                {t('rithmicProtocolSync.description')}
              </p>
            </div>
            <RithmicProtocolCredentialsManager />
          </>
        )}
      </div>
      <RithmicTrademarkFooter />
    </div>
  )
}
