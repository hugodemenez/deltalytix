'use client'

import { useCallback, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { showToastWithCopy } from '@/lib/toast-copy'
import { getEnabledDxFeedPropFirms } from '@/lib/dxfeed-propfirms'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { authenticateDxFeed } from './actions'
import { DxFeedCredentialsManager } from './dxfeed-credentials-manager'

const DXFEED_PROP_FIRM_OPTIONS = getEnabledDxFeedPropFirms()
const DEFAULT_PROP_FIRM_ID = DXFEED_PROP_FIRM_OPTIONS[0]?.id ?? ''
const PROP_FIRM_SEARCH_THRESHOLD = 5

const fieldClassName =
  'h-11 rounded-sm border-black/10 bg-transparent text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const configSelectClassName =
  'inline-flex h-8 max-w-full items-center gap-1 rounded-sm border border-black/10 bg-transparent px-2 text-xs font-normal shadow-none transition-colors duration-150 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

function DxFeedConnectView({ onConnected }: { onConnected?: () => void }) {
  const t = useI18n()
  const { loadAccounts } = useDxFeedSyncContext()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [selectedPropFirmId, setSelectedPropFirmId] = useState(DEFAULT_PROP_FIRM_ID)
  const [isLoading, setIsLoading] = useState(false)
  const [propFirmOpen, setPropFirmOpen] = useState(false)
  const [propFirmSearch, setPropFirmSearch] = useState('')

  const selectedPropFirm = DXFEED_PROP_FIRM_OPTIONS.find((f) => f.id === selectedPropFirmId)
  const showPropFirmSearch = DXFEED_PROP_FIRM_OPTIONS.length > PROP_FIRM_SEARCH_THRESHOLD
  const filteredPropFirms = propFirmSearch
    ? DXFEED_PROP_FIRM_OPTIONS.filter((firm) =>
        firm.name.toLowerCase().includes(propFirmSearch.toLowerCase())
      )
    : DXFEED_PROP_FIRM_OPTIONS

  const handleConnect = useCallback(async () => {
    if (!selectedPropFirmId) {
      showToastWithCopy('error', t('dxfeedSync.error.propFirmRequired'), {
        copyLabel: t('common.copy'),
      })
      return
    }
    if (!loginEmail || !loginPassword) {
      showToastWithCopy('error', t('dxfeedSync.error.credentialsRequired'), {
        copyLabel: t('common.copy'),
      })
      return
    }

    try {
      setIsLoading(true)
      const result = await authenticateDxFeed(
        loginEmail,
        loginPassword,
        selectedPropFirmId
      )

      if (result.error) {
        const { title, description } = getDxFeedErrorToastContent(
          t,
          result.error,
          result.errorParams
        )
        showToastWithCopy('error', title, {
          description,
          copyLabel: t('common.copy'),
        })
        return
      }

      showToastWithCopy('success', t('dxfeedSync.connected'), {
        copyLabel: t('common.copy'),
      })
      setLoginEmail('')
      setLoginPassword('')
      await loadAccounts()
      onConnected?.()
    } catch (error) {
      console.error('DxFeed connect error:', error)
      showToastWithCopy('error', t('dxfeedSync.error.authFailed'), {
        description: t('dxfeedSync.errors.hintCheckCredentials'),
        copyLabel: t('common.copy'),
      })
    } finally {
      setIsLoading(false)
    }
  }, [
    loginEmail,
    loginPassword,
    selectedPropFirmId,
    t,
    loadAccounts,
    onConnected,
  ])

  return (
    <form
      className="flex flex-col space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void handleConnect()
      }}
      autoComplete="on"
    >
      {DXFEED_PROP_FIRM_OPTIONS.length === 0 ? (
        <div className="space-y-3 border-y border-black/10 py-4 text-sm leading-relaxed text-black/55 dark:border-white/10 dark:text-white/55">
          <p className="font-medium text-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]">
            {t('dxfeedSync.addAccount.noPropFirmsTitle')}
          </p>
          <p>{t('dxfeedSync.addAccount.noPropFirmsDescription')}</p>
          <Link
            href="/support"
            className="inline-flex h-9 items-center rounded-sm border border-black/20 px-3 text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5"
          >
            {t('dxfeedSync.addAccount.noPropFirmsAction')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-b border-black/10 pb-3 dark:border-white/10">
          <Label
            htmlFor="dxfeed-prop-firm"
            className="shrink-0 text-xs text-black/45 dark:text-white/45"
          >
            {t('dxfeedSync.addAccount.propFirmLabel')}
          </Label>
          <Popover
            open={propFirmOpen}
            onOpenChange={(open) => {
              setPropFirmOpen(open)
              if (!open) setPropFirmSearch('')
            }}
          >
            <PopoverTrigger asChild>
              <button
                id="dxfeed-prop-firm"
                type="button"
                role="combobox"
                aria-expanded={propFirmOpen}
                className={configSelectClassName}
              >
                <span className="truncate">
                  {selectedPropFirm?.name ??
                    t('dxfeedSync.addAccount.propFirmPlaceholder')}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(20rem,var(--radix-popover-trigger-width))] max-w-[calc(100vw-2rem)] rounded-sm border-black/10 bg-white p-0 shadow-none dark:border-white/10 dark:bg-black"
              align="start"
            >
              <Command shouldFilter={false}>
                {showPropFirmSearch ? (
                  <CommandInput
                    placeholder={t('filters.searchPropfirm')}
                    value={propFirmSearch}
                    onValueChange={setPropFirmSearch}
                  />
                ) : null}
                <CommandList
                  className={
                    showPropFirmSearch
                      ? 'max-h-[min(280px,50vh)] overflow-y-auto'
                      : undefined
                  }
                >
                  <CommandEmpty>{t('filters.noPropfirmFound')}</CommandEmpty>
                  <CommandGroup>
                    {filteredPropFirms.map((firm) => (
                      <CommandItem
                        key={firm.id}
                        value={firm.id}
                        className="rounded-sm"
                        onSelect={() => {
                          setSelectedPropFirmId(firm.id)
                          setPropFirmOpen(false)
                          setPropFirmSearch('')
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            selectedPropFirmId === firm.id
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{firm.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
        {t('dxfeedSync.addAccount.description')}
      </p>

      <div className="space-y-2">
        <Label
          htmlFor="dxfeed-email"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('dxfeedSync.addAccount.emailLabel')}
        </Label>
        <Input
          id="dxfeed-email"
          name="email"
          type="email"
          autoComplete="username"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          placeholder={t('dxfeedSync.addAccount.emailPlaceholder')}
          className={fieldClassName}
          required
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="dxfeed-password"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('dxfeedSync.addAccount.passwordLabel')}
        </Label>
        <Input
          id="dxfeed-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          placeholder={t('dxfeedSync.addAccount.passwordPlaceholder')}
          className={fieldClassName}
          required
        />
      </div>

      <button
        type="submit"
        disabled={
          isLoading ||
          !selectedPropFirmId ||
          DXFEED_PROP_FIRM_OPTIONS.length === 0
        }
        className={primaryButtonClassName}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('dxfeedSync.addAccount.connecting')}
          </>
        ) : (
          t('dxfeedSync.addAccount.connect')
        )}
      </button>
    </form>
  )
}

interface DxFeedSyncProps {
  /** When false, open on the connect form instead of the saved-accounts list. */
  initialShowAccountsManager?: boolean
  onConnected?: () => void
}

export function DxFeedSync({
  initialShowAccountsManager = true,
  onConnected,
}: DxFeedSyncProps = {}) {
  const t = useI18n()

  if (!initialShowAccountsManager) {
    return <DxFeedConnectView onConnected={onConnected} />
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-0 sm:gap-6 sm:p-1">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-xl font-normal tracking-tight md:text-2xl">
          {t('dxfeedSync.title')}
        </h2>
        <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
          {t('dxfeedSync.description')}
        </p>
      </div>
      <DxFeedCredentialsManager />
    </div>
  )
}
