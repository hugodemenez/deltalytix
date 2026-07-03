'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Account } from '@/context/data-provider'
import type { Trade as PrismaTrade } from '@/prisma/generated/prisma/browser'
import { detectAccountBreach } from '@/lib/account-breach'
import { useI18n, useCurrentLocale } from '@/locales/client'
import { fr, enUS } from 'date-fns/locale'

const dismissedKey = (accountId: string) => `breach-prompt-dismissed:${accountId}`

type PendingBreachPrompt = {
  account: Account
  breachDate: Date
  firstPostBreachTradeDate: Date
}

interface AccountBreachPromptProps {
  accounts: Account[]
  trades: PrismaTrade[]
  saveAccount: (account: Account) => Promise<void>
}

export function AccountBreachPrompt({
  accounts,
  trades,
  saveAccount,
}: AccountBreachPromptProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<PendingBreachPrompt | null>(null)
  const [resetDate, setResetDate] = useState<Date | undefined>(undefined)

  const nextPrompt = useMemo(() => {
    for (const account of accounts) {
      if ((account.drawdownThreshold ?? 0) <= 0) continue

      const detection = detectAccountBreach(account, trades)
      if (
        !detection.needsUserConfirmation ||
        !detection.breachDate ||
        !detection.firstPostBreachTradeDate
      ) {
        continue
      }

      const accountId = account.id ?? account.number
      if (typeof window !== 'undefined' && sessionStorage.getItem(dismissedKey(accountId))) {
        continue
      }

      return {
        account,
        breachDate: detection.breachDate,
        firstPostBreachTradeDate: detection.firstPostBreachTradeDate,
      }
    }
    return null
  }, [accounts, trades])

  useEffect(() => {
    if (!nextPrompt) {
      setOpen(false)
      setPendingPrompt(null)
      return
    }

    setPendingPrompt(nextPrompt)
    setResetDate(nextPrompt.firstPostBreachTradeDate)
    setOpen(true)
  }, [nextPrompt])

  const dismissPrompt = () => {
    if (!pendingPrompt) return
    const accountId = pendingPrompt.account.id ?? pendingPrompt.account.number
    sessionStorage.setItem(dismissedKey(accountId), '1')
    setOpen(false)
    setPendingPrompt(null)
  }

  const handleMarkBursted = async () => {
    if (!pendingPrompt) return

    try {
      setIsSaving(true)
      await saveAccount({
        ...pendingPrompt.account,
        bursted: true,
        breachDate: pendingPrompt.breachDate,
      })
      setOpen(false)
      setPendingPrompt(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmReset = async () => {
    if (!pendingPrompt || !resetDate) return

    try {
      setIsSaving(true)
      await saveAccount({
        ...pendingPrompt.account,
        bursted: false,
        breachDate: null,
        resetDate,
        shouldConsiderTradesBeforeReset:
          pendingPrompt.account.shouldConsiderTradesBeforeReset ?? true,
      })
      setOpen(false)
      setPendingPrompt(null)
    } finally {
      setIsSaving(false)
    }
  }

  if (!pendingPrompt) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={(value) => {
      if (!value) dismissPrompt()
      else setOpen(value)
    }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('propFirm.bursted.promptTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('propFirm.bursted.promptDescription', {
              accountNumber: pendingPrompt.account.number,
              breachDate: format(pendingPrompt.breachDate, 'PP', { locale: dateLocale }),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label>{t('propFirm.bursted.resetDateLabel')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !resetDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {resetDate
                  ? format(resetDate, 'PP', { locale: dateLocale })
                  : t('propFirm.bursted.pickResetDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={resetDate}
                onSelect={setResetDate}
                defaultMonth={resetDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            disabled={isSaving || !resetDate}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirmReset()
            }}
          >
            {t('propFirm.bursted.confirmReset')}
          </AlertDialogAction>
          <Button
            variant="destructive"
            disabled={isSaving}
            onClick={() => void handleMarkBursted()}
          >
            {t('propFirm.bursted.markBursted')}
          </Button>
          <AlertDialogCancel disabled={isSaving} onClick={dismissPrompt}>
            {t('propFirm.bursted.dismiss')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
