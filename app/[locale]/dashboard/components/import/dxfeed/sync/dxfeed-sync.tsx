'use client'

import { useI18n } from "@/locales/client"
import { DxFeedCredentialsManager } from './dxfeed-credentials-manager'

export function DxFeedSync() {
  const t = useI18n()

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('dxfeedSync.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('dxfeedSync.description')}
        </p>
      </div>
      <DxFeedCredentialsManager />
    </div>
  )
}
