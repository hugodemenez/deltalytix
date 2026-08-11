'use client'

import { useCallback, useMemo, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/use-mobile'
import { getDxFeedErrorToastContent } from '@/lib/dxfeed-client-messages'
import { showToastWithCopy } from '@/lib/toast-copy'
import {
  getDxFeedPropFirm,
  getDxFeedPropFirmByAuthName,
  getEnabledDxFeedPropFirms,
} from '@/lib/dxfeed-propfirms'
import { useDxFeedSyncContext } from '@/context/dxfeed-sync-context'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import { authenticateDxFeed } from './actions'

const DXFEED_PROP_FIRM_OPTIONS = getEnabledDxFeedPropFirms()

const fieldClassName =
  'h-11 w-full min-w-0 max-w-full rounded-sm border-black/10 bg-transparent text-base sm:text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const pickerTriggerClassName =
  'inline-flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-sm border border-black/10 bg-transparent px-3 text-left text-base shadow-none transition-colors duration-150 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5 sm:text-sm'

const primaryButtonClassName =
  'inline-flex h-11 w-full items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

function resolvePrefillPropFirmId(propFirmName?: string) {
  if (!propFirmName) return ''
  return (
    getDxFeedPropFirm(propFirmName)?.id ??
    getDxFeedPropFirmByAuthName(propFirmName)?.id ??
    ''
  )
}

function PropFirmPicker({
  selectedPropFirmId,
  onSelect,
}: {
  selectedPropFirmId: string
  onSelect: (id: string) => void
}) {
  const t = useI18n()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedPropFirm = DXFEED_PROP_FIRM_OPTIONS.find(
    (firm) => firm.id === selectedPropFirmId,
  )

  const filteredPropFirms = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return DXFEED_PROP_FIRM_OPTIONS
    return DXFEED_PROP_FIRM_OPTIONS.filter((firm) =>
      firm.name.toLowerCase().includes(query),
    )
  }, [search])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setSearch('')
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
      handleOpenChange(false)
    },
    [onSelect, handleOpenChange],
  )

  const commandList = (
    <Command shouldFilter={false} className="min-w-0">
      <CommandInput
        placeholder={t('filters.searchPropfirm')}
        value={search}
        onValueChange={setSearch}
        className="text-base sm:text-sm"
      />
      <CommandList className="max-h-[min(320px,50vh)] overflow-y-auto overflow-x-hidden">
        <CommandEmpty>{t('filters.noPropfirmFound')}</CommandEmpty>
        <CommandGroup>
          {filteredPropFirms.map((firm) => (
            <CommandItem
              key={firm.id}
              value={firm.id}
              className="rounded-sm"
              onSelect={() => handleSelect(firm.id)}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4 shrink-0',
                  selectedPropFirmId === firm.id ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="min-w-0 truncate">{firm.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isMobile) {
    return (
      <>
        <button
          id="dxfeed-prop-firm"
          type="button"
          role="combobox"
          aria-expanded={open}
          className={pickerTriggerClassName}
          onClick={() => handleOpenChange(true)}
        >
          <span className="min-w-0 truncate">
            {selectedPropFirm?.name ??
              t('dxfeedSync.addAccount.propFirmPlaceholder')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="rounded-t-sm border-black/10 dark:border-white/10">
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-normal tracking-tight">
                {t('dxfeedSync.addAccount.propFirmLabel')}
              </DrawerTitle>
              <DrawerDescription className="text-black/55 dark:text-white/55">
                {t('dxfeedSync.addAccount.propFirmHint')}
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-w-0 overflow-x-hidden px-2 pb-4">
              {commandList}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id="dxfeed-prop-firm"
          type="button"
          role="combobox"
          aria-expanded={open}
          className={pickerTriggerClassName}
        >
          <span className="min-w-0 truncate">
            {selectedPropFirm?.name ??
              t('dxfeedSync.addAccount.propFirmPlaceholder')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] rounded-sm border-black/10 bg-white p-0 shadow-none dark:border-white/10 dark:bg-black"
        align="start"
      >
        {commandList}
      </PopoverContent>
    </Popover>
  )
}

export function DxFeedConnectForm({
  onConnected,
  initialEmail,
  initialPropFirmName,
}: {
  onConnected?: () => void
  initialEmail?: string
  initialPropFirmName?: string
}) {
  const t = useI18n()
  const { loadAccounts } = useDxFeedSyncContext()
  const [loginEmail, setLoginEmail] = useState(initialEmail ?? '')
  const [loginPassword, setLoginPassword] = useState('')
  const [selectedPropFirmId, setSelectedPropFirmId] = useState(() =>
    resolvePrefillPropFirmId(initialPropFirmName),
  )
  const [isLoading, setIsLoading] = useState(false)

  const credentialsEnabled = Boolean(selectedPropFirmId)

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
        selectedPropFirmId,
      )

      if (result.error) {
        const { title, description } = getDxFeedErrorToastContent(
          t,
          result.error,
          result.errorParams,
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
      captureConnectionCreated('dxfeed')
      setLoginEmail('')
      setLoginPassword('')
      setSelectedPropFirmId('')
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

  if (DXFEED_PROP_FIRM_OPTIONS.length === 0) {
    return (
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
    )
  }

  return (
    <form
      className="flex w-full min-w-0 flex-col space-y-5 overflow-x-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        void handleConnect()
      }}
      autoComplete="on"
    >
      <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
        {t('dxfeedSync.addAccount.description')}
      </p>

      <div className="min-w-0 space-y-2">
        <Label
          htmlFor="dxfeed-prop-firm"
          className="text-sm text-black/55 dark:text-white/55"
        >
          {t('dxfeedSync.addAccount.propFirmLabel')}
        </Label>
        <PropFirmPicker
          selectedPropFirmId={selectedPropFirmId}
          onSelect={setSelectedPropFirmId}
        />
        <p className="text-xs leading-relaxed text-black/45 dark:text-white/45">
          {t('dxfeedSync.addAccount.propFirmHint')}
        </p>
      </div>

      <div className="min-w-0 space-y-2">
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
          disabled={!credentialsEnabled}
        />
      </div>

      <div className="min-w-0 space-y-2">
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
          disabled={!credentialsEnabled}
        />
      </div>

      <button
        type="submit"
        disabled={
          isLoading ||
          !credentialsEnabled ||
          !loginEmail ||
          !loginPassword
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
