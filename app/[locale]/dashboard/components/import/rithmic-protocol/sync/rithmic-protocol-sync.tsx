'use client'

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
    </div>
  )
}
