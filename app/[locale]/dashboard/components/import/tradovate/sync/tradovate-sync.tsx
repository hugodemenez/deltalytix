'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { TradovateCredentialsManager } from './tradovate-credentials-manager'
import {
  initiateTradovateOAuth,
  type TradovateEnvironment,
} from './actions'
import { useTradovateSyncStore } from '@/store/tradovate-sync-store'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

function TradovateConnectView() {
  const t = useI18n()
  const tradovateStore = useTradovateSyncStore()
  const [environment, setEnvironment] = useState<TradovateEnvironment>('demo')
  const [isLoading, setIsLoading] = useState(false)

  const handleStartOAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      tradovateStore.setEnvironment(environment)
      const result = await initiateTradovateOAuth('default', environment)
      if (result.error || !result.authUrl || !result.state) {
        toast.error(t('tradovateSync.error.oauthInit'))
        return
      }

      tradovateStore.setOAuthState(result.state)
      sessionStorage.setItem('tradovate_oauth_state', result.state)
      sessionStorage.setItem(
        'tradovate_oauth_pending',
        JSON.stringify({ environment })
      )
      window.location.href = result.authUrl
    } catch {
      toast.error(t('tradovateSync.error.oauthInit'))
    } finally {
      setIsLoading(false)
    }
  }, [environment, t, tradovateStore])

  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-black/45 dark:text-white/45">
          {t('tradovateSync.environment')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'demo' as const, label: t('tradovateSync.environments.demo') },
            { value: 'live' as const, label: t('tradovateSync.environments.live') },
          ]).map((option) => {
            const selected = environment === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setEnvironment(option.value)}
                className={cn(
                  'rounded-sm border px-3 py-2.5 text-left text-sm transition-[background-color,border-color,transform,opacity] duration-150 active:scale-[0.98]',
                  selected
                    ? 'border-black/20 bg-black/5 dark:border-white/20 dark:bg-white/5'
                    : 'border-black/10 text-black/55 hover:bg-black/5 dark:border-white/10 dark:text-white/55 dark:hover:bg-white/5'
                )}
              >
                <span className="font-medium text-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]">
                  {option.value === 'demo'
                    ? t('tradovateSync.multiAccount.environmentDemo')
                    : t('tradovateSync.multiAccount.environmentLive')}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-black/45 dark:text-white/45">
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
        {environment === 'live' && (
          <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
            {t('tradovateSync.liveWarning')}
          </p>
        )}
      </div>

      <div className="space-y-2 border-y border-black/10 py-4 text-sm leading-relaxed text-black/55 dark:border-white/10 dark:text-white/55">
        <p>{t('tradovateSync.importInfo.currentDayOnly')}</p>
        <p>{t('tradovateSync.importInfo.dailySyncReminder')}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
          {t('tradovateSync.oauthNotice')}
        </p>
        <button
          type="button"
          onClick={() => void handleStartOAuth()}
          disabled={isLoading}
          className={primaryButtonClassName}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('tradovateSync.connectAccount')}
        </button>
      </div>
    </div>
  )
}

interface TradovateSyncProps {
  /** When false, open on the OAuth connect view instead of the saved-accounts list. */
  initialShowAccountsManager?: boolean
}

export function TradovateSync({
  initialShowAccountsManager = true,
}: TradovateSyncProps = {}) {
  const t = useI18n()

  if (!initialShowAccountsManager) {
    return <TradovateConnectView />
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-normal tracking-tight md:text-2xl">
          {t('tradovateSync.title')}
        </h2>
        <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
          {t('tradovateSync.description')}
        </p>
      </div>

      <div className="space-y-2 border-y border-black/10 py-4 text-sm leading-relaxed text-black/55 dark:border-white/10 dark:text-white/55">
        <p className="font-medium text-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]">
          {t('tradovateSync.importInfo.title')}
        </p>
        <p>{t('tradovateSync.importInfo.currentDayOnly')}</p>
        <p>{t('tradovateSync.importInfo.dailySyncReminder')}</p>
      </div>

      <TradovateCredentialsManager />
    </div>
  )
}
