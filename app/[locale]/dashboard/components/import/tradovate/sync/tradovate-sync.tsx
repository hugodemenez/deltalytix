'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useI18n } from "@/locales/client"
import { Info } from 'lucide-react'
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

      <Alert className="border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30">
        <Info className="h-4 w-4" />
        <AlertTitle>{t('tradovateSync.importInfo.title')}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{t('tradovateSync.importInfo.currentDayOnly')}</p>
          <p>{t('tradovateSync.importInfo.dailySyncReminder')}</p>
        </AlertDescription>
      </Alert>

      <TradovateCredentialsManager />
    </div>
  )
}
