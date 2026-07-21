'use client'

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThemeAwareLogo } from '@/components/monochrome-logo'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import { RITHMIC_PROTOCOL_FALLBACK_SYSTEMS } from '@/lib/rithmic-protocol/systems'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { toast } from 'sonner'
import {
  authenticateRithmicProtocol,
  listRithmicProtocolSystems,
} from './actions'
import { RithmicProtocolCredentialsManager } from './rithmic-protocol-credentials-manager'

const fieldClassName =
  'h-11 rounded-sm border-black/10 bg-transparent text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const configSelectClassName =
  'h-8 w-auto min-w-0 max-w-full gap-1 rounded-sm border-black/10 bg-transparent px-2 text-xs shadow-none focus:ring-0 focus:ring-offset-0 dark:border-white/10 [&>span]:truncate'

const selectContentClassName =
  'rounded-sm border-black/10 bg-white shadow-none dark:border-white/10 dark:bg-black'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

function RithmicProtocolConnectView({
  onConnected,
}: {
  onConnected?: () => void
}) {
  const t = useI18n()
  const { loadAccounts } = useRithmicProtocolSyncContext()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [systems, setSystems] = useState<string[]>([
    ...RITHMIC_PROTOCOL_FALLBACK_SYSTEMS,
  ])
  const [systemName, setSystemName] = useState<string>(
    RITHMIC_PROTOCOL_FALLBACK_SYSTEMS[0],
  )
  const [loadingSystems, setLoadingSystems] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setLoadingSystems(true)
        const result = await listRithmicProtocolSystems()
        if (cancelled) return
        if (result.systems.length > 0) {
          setSystems(result.systems)
          setSystemName((current) =>
            result.systems.includes(current) ? current : result.systems[0],
          )
        }
      } catch (error) {
        console.warn('Failed to load Rithmic Protocol systems', error)
      } finally {
        if (!cancelled) setLoadingSystems(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleConnect = useCallback(async () => {
    if (!username || !password || !systemName) {
      toast.error(t('rithmicProtocolSync.error.credentialsRequired'))
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticateRithmicProtocol(
        username,
        password,
        systemName,
      )

      if ('error' in result && result.error) {
        const translate = t as (
          key: string,
          params?: Record<string, string | number>,
        ) => string
        toast.error(
          translate(`rithmicProtocolSync.errors.${result.error}`, {
            reason: String(result.errorParams?.reason ?? ''),
          }),
        )
        return
      }

      toast.success(t('rithmicProtocolSync.connected'))
      captureConnectionCreated('rithmic-protocol')
      setUsername('')
      setPassword('')
      await loadAccounts()
      onConnected?.()
    } catch (error) {
      console.error('Rithmic Protocol connect error:', error)
      toast.error(t('rithmicProtocolSync.error.authFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [username, password, systemName, t, loadAccounts, onConnected])

  return (
    <form
      className="flex flex-col space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void handleConnect()
      }}
      autoComplete="on"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/10 pb-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2">
          <Label
            htmlFor="rithmic-protocol-system"
            className="shrink-0 text-xs text-black/45 dark:text-white/45"
          >
            {t('rithmicProtocolSync.addAccount.systemLabel')}
          </Label>
          <Select
            value={systemName}
            onValueChange={setSystemName}
            disabled={loadingSystems || systems.length === 0}
          >
            <SelectTrigger
              id="rithmic-protocol-system"
              className={configSelectClassName}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              {systems.map((system) => (
                <SelectItem
                  key={system}
                  value={system}
                  className="rounded-sm text-xs"
                >
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loadingSystems ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-black/35 dark:text-white/35" />
          ) : null}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
        {t('rithmicProtocolSync.addAccount.description')}
      </p>

      <div className="space-y-2">
        <Label
          htmlFor="rithmic-protocol-username"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('rithmicProtocolSync.addAccount.usernameLabel')}
        </Label>
        <Input
          id="rithmic-protocol-username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          spellCheck={false}
          required
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="rithmic-protocol-password"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('rithmicProtocolSync.addAccount.passwordLabel')}
        </Label>
        <Input
          id="rithmic-protocol-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={fieldClassName}
        />
      </div>

      <button
        type="submit"
        disabled={
          isLoading ||
          loadingSystems ||
          !username ||
          !password ||
          !systemName
        }
        className={primaryButtonClassName}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('rithmicProtocolSync.addAccount.connecting')}
          </>
        ) : (
          t('rithmicProtocolSync.addAccount.connect')
        )}
      </button>
    </form>
  )
}

interface RithmicProtocolSyncProps {
  /** When false, open on the connect form instead of the saved-accounts list. */
  initialShowAccountsManager?: boolean
  onConnected?: () => void
  /** Accepted for PlatformConfig customComponent compatibility; unused here. */
  setIsOpen?: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void)
}

export function RithmicProtocolSync({
  initialShowAccountsManager = true,
  onConnected,
  setIsOpen: _setIsOpen,
}: RithmicProtocolSyncProps = {}) {
  const t = useI18n()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {!initialShowAccountsManager ? (
          <RithmicProtocolConnectView onConnected={onConnected} />
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
      <div className="shrink-0 space-y-2 border-t border-black/10 pt-4 text-xs leading-relaxed text-black/45 dark:border-white/10 dark:text-white/45">
        <div className="mb-2 flex items-center gap-4">
          <ThemeAwareLogo
            path="/logos/monochrome/trading-platform-by-rithmic-black.png"
            darkPath="/logos/monochrome/trading-platform-by-rithmic-white.png"
            alt="Trading Platform by Rithmic"
            width={164}
            height={35}
            className="h-7 w-auto"
          />
          <ThemeAwareLogo
            path="/logos/monochrome/powered-by-omne-black.png"
            darkPath="/logos/monochrome/powered-by-omne-white.png"
            alt="Powered by OMNE"
            width={141}
            height={15}
            className="h-3.5 w-auto"
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
