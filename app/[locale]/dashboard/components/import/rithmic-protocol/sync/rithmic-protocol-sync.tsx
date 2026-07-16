'use client'

import Image from 'next/image'
import { useI18n } from '@/locales/client'
import { RithmicProtocolCredentialsManager } from './rithmic-protocol-credentials-manager'

export function RithmicProtocolSync() {
  const t = useI18n()

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-w-0 w-full p-0 sm:p-1">
      <div className="flex flex-col gap-1.5 min-w-0">
        <h2 className="text-base sm:text-lg font-semibold">
          {t('rithmicProtocolSync.title')}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('rithmicProtocolSync.description')}
        </p>
      </div>
      <RithmicProtocolCredentialsManager />
      <div className="mt-2 text-xs text-muted-foreground space-y-2 border-t pt-4">
        <div className="flex items-center gap-4 mb-2">
          <Image
            src="/logos/TradingPlatformByRithmic-Black.png"
            alt="Trading Platform by Rithmic"
            width={120}
            height={40}
            className="dark:hidden"
          />
          <Image
            src="/logos/TradingPlatformByRithmic-Green.png"
            alt="Trading Platform by Rithmic"
            width={120}
            height={40}
            className="hidden dark:block"
          />
          <Image
            src="/logos/Powered_by_Omne.png"
            alt="Powered by OMNE"
            width={120}
            height={40}
          />
        </div>
        <p>{t('import.type.copyright.rithmic')}</p>
        <p>{t('import.type.copyright.protocol')}</p>
        <p>{t('import.type.copyright.platform')}</p>
        <p>{t('import.type.copyright.omne')}</p>
      </div>
    </div>
  )
}
