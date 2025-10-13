'use client'

import { useI18n } from "@/locales/client"
import { TradovateCredentialsManager } from './tradovate-credentials-manager'
 

export function TradovateSync() {
  const t = useI18n()

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('tradovateSync.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('tradovateSync.description')}
        </p>
      </div>
      <TradovateCredentialsManager />
    </div>
  )
} 