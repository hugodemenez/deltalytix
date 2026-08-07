'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, Copy, ExternalLink, Info } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'

/**
 * Client Portal entry point. Overridable so the exact Flex Queries deep link can
 * be swapped in without a code change once verified against a live account.
 */
const IBKR_PORTAL_URL =
  process.env.NEXT_PUBLIC_IBKR_FLEX_PORTAL_URL || 'https://www.interactivebrokers.com/portal'

/** The query settings the sync depends on, kept in one place so the guide,
 *  the copyable summary and the error hints cannot drift apart. */
export const IBKR_REQUIRED_QUERY_SETTINGS = {
  section: 'Trades',
  period: 'Last 365 Calendar Days',
  format: 'XML',
  dateFormat: 'yyyyMMdd',
  timeFormat: 'HHmmss',
} as const

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Clipboard denied (insecure context or permission): the value is
          // visible on screen, so selecting it by hand still works.
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  )
}

function Step({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children?: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums"
        aria-hidden="true"
      >
        {index}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm leading-snug">{title}</p>
        {children}
      </div>
    </li>
  )
}

/**
 * Walks the user through the Client Portal setup that the Flex Web Service
 * requires. IBKR gives no way to provision a query on the user's behalf, so the
 * next best thing is to make every step unambiguous and pre-fill what we can.
 */
export function IbkrSetupGuide({ className }: { className?: string }) {
  const t = useI18n()

  const settingsSummary = [
    `${t('ibkrSync.setup.summarySection')}: ${IBKR_REQUIRED_QUERY_SETTINGS.section}`,
    `${t('ibkrSync.setup.summaryPeriod')}: ${IBKR_REQUIRED_QUERY_SETTINGS.period}`,
    `${t('ibkrSync.setup.summaryFormat')}: ${IBKR_REQUIRED_QUERY_SETTINGS.format}`,
    `${t('ibkrSync.setup.summaryDateFormat')}: ${IBKR_REQUIRED_QUERY_SETTINGS.dateFormat} / ${IBKR_REQUIRED_QUERY_SETTINGS.timeFormat}`,
  ].join('\n')

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{t('ibkrSync.setup.title')}</h4>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" asChild>
          <a href={IBKR_PORTAL_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            {t('ibkrSync.setup.openPortal')}
          </a>
        </Button>
      </div>

      <ol className="space-y-3">
        <Step index={1} title={t('ibkrSync.setup.step1')} />
        <Step index={2} title={t('ibkrSync.setup.step2')}>
          <p className="text-xs text-muted-foreground">{t('ibkrSync.setup.step2Hint')}</p>
        </Step>
        <Step index={3} title={t('ibkrSync.setup.step3')}>
          <p className="text-xs text-muted-foreground">{t('ibkrSync.setup.step3Hint')}</p>
        </Step>
        <Step index={4} title={t('ibkrSync.setup.step4')}>
          <div className="rounded-md border bg-muted/40 p-2">
            <dl className="space-y-0.5 text-xs">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">
                  {t('ibkrSync.setup.summarySection')}
                </dt>
                <dd className="font-mono">{IBKR_REQUIRED_QUERY_SETTINGS.section}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">
                  {t('ibkrSync.setup.summaryPeriod')}
                </dt>
                <dd className="font-mono">{IBKR_REQUIRED_QUERY_SETTINGS.period}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">
                  {t('ibkrSync.setup.summaryFormat')}
                </dt>
                <dd className="font-mono">{IBKR_REQUIRED_QUERY_SETTINGS.format}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted-foreground">
                  {t('ibkrSync.setup.summaryDateFormat')}
                </dt>
                <dd className="font-mono">
                  {IBKR_REQUIRED_QUERY_SETTINGS.dateFormat} /{' '}
                  {IBKR_REQUIRED_QUERY_SETTINGS.timeFormat}
                </dd>
              </div>
            </dl>
            <div className="mt-1.5 flex justify-end">
              <CopyButton value={settingsSummary} label={t('common.copy')} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('ibkrSync.setup.step4Hint')}</p>
        </Step>
        <Step index={5} title={t('ibkrSync.setup.step5')} />
      </ol>

      <Alert variant="info" role="note">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertDescription className="text-xs">
          {t('ibkrSync.setup.readOnlyNote')}
        </AlertDescription>
      </Alert>
    </div>
  )
}
