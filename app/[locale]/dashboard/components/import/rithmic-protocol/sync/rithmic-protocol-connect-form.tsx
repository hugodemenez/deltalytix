'use client'

import { useCallback, useState } from 'react'
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import { useRithmicProtocolSyncContext } from '@/context/rithmic-protocol-sync-context'
import { toast } from 'sonner'
import { authenticateRithmicProtocol } from './actions'
import { useRithmicProtocolConnectOptions } from './use-rithmic-protocol-connect-options'

const fieldClassName =
  'h-11 rounded-sm border-black/10 bg-transparent text-base sm:text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const selectTriggerClassName =
  'h-11 w-full rounded-sm border-black/10 bg-transparent text-base sm:text-sm shadow-none focus:ring-0 focus:ring-offset-0 dark:border-white/10'

const selectContentClassName =
  'rounded-sm border-black/10 bg-white shadow-none dark:border-white/10 dark:bg-black'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

type ConnectStep = 'system' | 'credentials'

export function RithmicProtocolConnectForm({
  onConnected,
  initialUsername,
  enabled = true,
}: {
  onConnected?: () => void
  initialUsername?: string
  /** When false, skip loading gateways/systems (e.g. closed dialog). */
  enabled?: boolean
}) {
  const t = useI18n()
  const { loadAccounts, performSyncForAccount } = useRithmicProtocolSyncContext()
  const [step, setStep] = useState<ConnectStep>('system')
  const [username, setUsername] = useState(initialUsername ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState('')
  const {
    gateways,
    gatewayId,
    setGatewayId,
    systems,
    systemName,
    setSystemName,
    loadingGateways,
    loadingSystems,
  } = useRithmicProtocolConnectOptions(enabled)
  const [isLoading, setIsLoading] = useState(false)

  const todayUtc = new Date().toISOString().slice(0, 10)
  const selectedGateway = gateways.find((gateway) => gateway.id === gatewayId)
  const systemReady =
    !loadingGateways &&
    !loadingSystems &&
    gateways.length > 0 &&
    systems.length > 0 &&
    Boolean(systemName)

  const handleConnect = useCallback(async () => {
    if (!username || !password || !systemName || !historyStartDate) {
      toast.error(t('rithmicProtocolSync.error.credentialsRequired'))
      return
    }

    const connectedUsername = username
    try {
      setIsLoading(true)
      const result = await authenticateRithmicProtocol(
        username,
        password,
        systemName,
        historyStartDate,
        gatewayId,
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
      setShowPassword(false)
      setHistoryStartDate('')
      setStep('system')
      await loadAccounts()
      onConnected?.()
      // One sync pulls every trading account stored on this connection.
      void performSyncForAccount(connectedUsername)
    } catch (error) {
      console.error('Rithmic Protocol connect error:', error)
      toast.error(t('rithmicProtocolSync.error.authFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [
    username,
    password,
    systemName,
    historyStartDate,
    gatewayId,
    t,
    loadAccounts,
    performSyncForAccount,
    onConnected,
  ])

  if (step === 'system') {
    return (
      <div className="flex flex-col space-y-5">
        <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
          {t('rithmicProtocolSync.addAccount.systemStepDescription')}
        </p>

        <div className="space-y-2">
          <Label
            htmlFor="rithmic-protocol-gateway"
            className="text-sm text-black/55 dark:text-white/55"
          >
            {t('rithmicProtocolSync.addAccount.gatewayLabel')}
          </Label>
          <Select
            value={gatewayId}
            onValueChange={setGatewayId}
            disabled={loadingGateways || gateways.length === 0}
          >
            <SelectTrigger
              id="rithmic-protocol-gateway"
              className={selectTriggerClassName}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              {gateways.map((gateway) => (
                <SelectItem
                  key={gateway.id}
                  value={gateway.id}
                  className="rounded-sm"
                >
                  {gateway.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
            {t('rithmicProtocolSync.addAccount.gatewayHelp')}
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="rithmic-protocol-system"
            className="text-sm text-black/55 dark:text-white/55"
          >
            {t('rithmicProtocolSync.addAccount.systemLabel')}
          </Label>
          <div className="relative">
            <Select
              value={systemName}
              onValueChange={setSystemName}
              disabled={loadingSystems || systems.length === 0}
            >
              <SelectTrigger
                id="rithmic-protocol-system"
                className={selectTriggerClassName}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                {systems.map((system) => (
                  <SelectItem
                    key={system}
                    value={system}
                    className="rounded-sm"
                  >
                    {system}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingSystems ? (
              <Loader2 className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-black/35 dark:text-white/35" />
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={!systemReady}
          onClick={() => setStep('credentials')}
          className={primaryButtonClassName}
        >
          {t('rithmicProtocolSync.addAccount.continueToCredentials')}
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void handleConnect()
      }}
      autoComplete="on"
    >
      <div className="flex flex-col gap-2 rounded-sm border border-black/10 px-3 py-2.5 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-black/45 dark:text-white/45">
              {t('rithmicProtocolSync.addAccount.systemLabel')}
            </p>
            <p className="truncate text-sm font-medium">{systemName}</p>
            {selectedGateway ? (
              <p className="truncate text-xs text-black/45 dark:text-white/45">
                {selectedGateway.label}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPassword(false)
              setStep('system')
            }}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-black/55 transition-colors hover:text-black dark:text-white/55 dark:hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t('common.back')}
          </button>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
        {t('rithmicProtocolSync.addAccount.credentialsStepDescription')}
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
        <div className="relative">
          <Input
            id="rithmic-protocol-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`${fieldClassName} pr-10`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-black/45 hover:bg-transparent hover:text-black dark:text-white/45 dark:hover:text-white"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword
                ? t('rithmicProtocolSync.addAccount.hidePassword')
                : t('rithmicProtocolSync.addAccount.showPassword')
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="rithmic-protocol-history-start"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('rithmicProtocolSync.addAccount.historyStartLabel')}
        </Label>
        <Input
          id="rithmic-protocol-history-start"
          name="historyStartDate"
          type="date"
          value={historyStartDate}
          onChange={(e) => setHistoryStartDate(e.target.value)}
          min="2013-01-01"
          max={todayUtc}
          required
          className={fieldClassName}
        />
        <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
          {t('rithmicProtocolSync.addAccount.historyStartHelp')}
        </p>
      </div>

      <button
        type="submit"
        disabled={
          isLoading || !username || !password || !systemName || !historyStartDate
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
