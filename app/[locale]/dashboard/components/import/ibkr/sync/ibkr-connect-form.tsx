'use client'

import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { useData } from '@/context/data-provider'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { showToastWithCopy } from '@/lib/toast-copy'
import { getIbkrErrorToastContent } from '@/lib/ibkr-client-messages'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import { parseIbkrCredentialsInput } from '@/lib/ibkr-flex-credentials'
import { useIbkrSyncContext } from '@/context/ibkr-sync-context'
import { IbkrSetupGuide } from './ibkr-setup-guide'
import type { IbkrSyncStats } from './ibkr-types'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

const fieldClassName =
  'rounded-sm border-black/10 bg-transparent font-mono text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

/** Shows only the last few characters so the user can confirm what we detected
 *  without the full secret sitting on screen. */
function maskToken(token: string): string {
  if (token.length <= 4) return '•'.repeat(token.length)
  return `${'•'.repeat(Math.min(token.length - 4, 12))}${token.slice(-4)}`
}

function DetectedRow({ found, label, value }: { found: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {found ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-500" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
      )}
      <span className="text-black/45 dark:text-white/45">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

/**
 * The whole connect flow: the Client Portal walkthrough, a single paste field,
 * and a live verification against IBKR before anything is saved.
 *
 * Verification is the point. IBKR gives no way to provision a Flex Query for
 * the user, so the only defence against a mis-clicked setting is to fetch a
 * real statement and show them what came back.
 */
export function IbkrConnectForm({
  onConnected,
}: {
  onConnected?: (accountId: string) => void
}) {
  const t = useI18n()
  const { loadAccounts } = useIbkrSyncContext()
  const { refreshTradesOnly } = useData()

  const [pastedCredentials, setPastedCredentials] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [preview, setPreview] = useState<{
    accountId: string
    stats: IbkrSyncStats
    savedCount: number
  } | null>(null)

  // Parsed live as the user types, so the form can confirm both values were
  // found before they commit to a round-trip against IBKR.
  const detected = useMemo(
    () => parseIbkrCredentialsInput(pastedCredentials),
    [pastedCredentials],
  )
  const canConnect = !!detected.token && !!detected.queryId && !isConnecting

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    setPreview(null)

    try {
      const response = await fetch('/api/ibkr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: pastedCredentials }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        const { title, description } = getIbkrErrorToastContent(
          t,
          payload?.message,
          payload?.errorParams,
        )
        showToastWithCopy('error', title, { description, copyLabel: t('common.copy') })
        return
      }

      // Connecting already imported the statement, so surface a save failure
      // here rather than pretending the import succeeded.
      if (payload.message) {
        const { title, description } = getIbkrErrorToastContent(
          t,
          payload.message,
          payload.errorParams,
        )
        showToastWithCopy('error', title, { description, copyLabel: t('common.copy') })
      }

      // Stay on the form and show what IBKR returned: the counts are the proof
      // the setup worked, and closing immediately would hide them.
      setPreview({
        accountId: payload.accountId,
        stats: payload.stats as IbkrSyncStats,
        savedCount: payload.savedCount ?? 0,
      })
      captureConnectionCreated('ibkr')
      await loadAccounts()
      await refreshTradesOnly({ force: false })
    } catch (error) {
      console.error('IBKR connect error:', error)
      const { title, description } = getIbkrErrorToastContent(t, 'UNKNOWN')
      showToastWithCopy('error', title, { description, copyLabel: t('common.copy') })
    } finally {
      setIsConnecting(false)
    }
  }, [pastedCredentials, t, loadAccounts, refreshTradesOnly])

  const handleDone = useCallback(() => {
    if (!preview) return
    const { accountId } = preview
    setPastedCredentials('')
    setPreview(null)
    onConnected?.(accountId)
  }, [preview, onConnected])

  if (preview) {
    const { stats, savedCount } = preview
    return (
      <div className="flex flex-col space-y-5">
        <div className="space-y-2 border-y border-black/10 py-4 dark:border-white/10">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Check className="h-4 w-4 text-green-600 dark:text-green-500" aria-hidden="true" />
            {t('ibkrSync.connect.verifiedTitle')}
          </p>
          <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
            {savedCount > 0
              ? t('ibkrSync.connect.importedTrades', {
                  savedCount,
                  tradesCount: stats.matchedTrades,
                })
              : t('ibkrSync.connect.nothingNew', { tradesCount: stats.matchedTrades })}
          </p>
          {stats.accountIds.length > 0 && (
            <p className="font-mono text-xs text-black/55 dark:text-white/55">
              {stats.accountIds.join(', ')}
            </p>
          )}
          {stats.skippedUnparseableDate > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {t('ibkrSync.sync.skippedDatesWarning', {
                count: stats.skippedUnparseableDate,
              })}
            </p>
          )}
          {stats.currencies.length > 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {t('ibkrSync.sync.multiCurrencyWarning', {
                currencies: stats.currencies.join(', '),
              })}
            </p>
          )}
        </div>
        <button type="button" className={primaryButtonClassName} onClick={handleDone}>
          {t('ibkrSync.connect.done')}
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (canConnect) void handleConnect()
      }}
    >
      <IbkrSetupGuide />

      <div className="space-y-2">
        <Label
          htmlFor="ibkr-credentials"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('ibkrSync.connect.pasteLabel')}
        </Label>
        <Textarea
          id="ibkr-credentials"
          value={pastedCredentials}
          onChange={(e) => setPastedCredentials(e.target.value)}
          placeholder={t('ibkrSync.connect.pastePlaceholder')}
          rows={3}
          className={fieldClassName}
          spellCheck={false}
        />
        <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
          {t('ibkrSync.connect.pasteHint')}
        </p>

        {pastedCredentials.trim().length > 0 && (
          <div className="space-y-1 rounded-sm border border-black/10 p-2 text-xs dark:border-white/10">
            <DetectedRow
              found={!!detected.token}
              label={t('ibkrSync.connect.detectedToken')}
              value={
                detected.token
                  ? maskToken(detected.token)
                  : t('ibkrSync.connect.notDetected')
              }
            />
            <DetectedRow
              found={!!detected.queryId}
              label={t('ibkrSync.connect.detectedQueryId')}
              value={detected.queryId ?? t('ibkrSync.connect.notDetected')}
            />
          </div>
        )}
      </div>

      <button type="submit" disabled={!canConnect} className={primaryButtonClassName}>
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('ibkrSync.connect.verifying')}
          </>
        ) : (
          t('ibkrSync.connect.verifyAndConnect')
        )}
      </button>
    </form>
  )
}
