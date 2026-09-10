'use client'

import { useRef } from 'react'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  TRADOVATE_FEE_EXAMPLE,
  getTotalFeeFromFillFee,
  includedFeeTypesForExampleChoice,
  type TradovateFeeExampleChoice,
} from '@/app/[locale]/dashboard/components/import/tradovate/sync/fee-types'

const skipButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium text-black/55 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white'

function formatExampleAmount(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function ExampleChoiceCard({
  choice,
  onSelect,
}: {
  choice: TradovateFeeExampleChoice
  onSelect: (choice: TradovateFeeExampleChoice) => void
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const amount = getTotalFeeFromFillFee(
    TRADOVATE_FEE_EXAMPLE.fill,
    includedFeeTypesForExampleChoice(choice)
  )
  const title =
    choice === 'commission-only'
      ? t('tradovateSync.multiAccount.feeExample.commissionOnlyTitle')
      : t('tradovateSync.multiAccount.feeExample.allFeesTitle')
  const hint =
    choice === 'commission-only'
      ? t('tradovateSync.multiAccount.feeExample.commissionOnlyHint')
      : t('tradovateSync.multiAccount.feeExample.allFeesHint')

  return (
    <button
      type="button"
      data-testid={`tradovate-fee-example-${choice}`}
      className="flex w-full items-baseline justify-between gap-4 rounded-sm border border-black/20 px-4 py-4 text-left transition-[background-color,border-color,transform] duration-150 hover:bg-black/5 active:scale-[0.99] dark:border-white/20 dark:hover:bg-white/5"
      onClick={() => onSelect(choice)}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium tracking-tight">{title}</span>
        <span className="mt-1 block text-sm text-black/55 dark:text-white/55">
          {hint}
        </span>
      </span>
      <span className="shrink-0 text-xl font-normal tabular-nums tracking-tight md:text-2xl">
        {formatExampleAmount(amount, locale)}
      </span>
    </button>
  )
}

export function TradovateFeeExamplePicker({
  open,
  onOpenChange,
  onChoose,
  onDismiss,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (choice: TradovateFeeExampleChoice) => void | Promise<void>
  onDismiss: () => void | Promise<void>
}) {
  const t = useI18n()
  const choseRef = useRef(false)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          choseRef.current = false
          onOpenChange(true)
          return
        }
        onOpenChange(false)
        if (!choseRef.current) void onDismiss()
      }}
    >
      <AlertDialogContent
        className="rounded-sm border-black/10 dark:border-white/10"
        data-testid="tradovate-fee-example-picker"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-normal tracking-tight">
            {t('tradovateSync.multiAccount.feeExample.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-black/55 dark:text-white/55">
            {t('tradovateSync.multiAccount.feeExample.description', {
              instrument: TRADOVATE_FEE_EXAMPLE.instrument,
              quantity: TRADOVATE_FEE_EXAMPLE.quantity,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-black/45 dark:text-white/45">
            {t('tradovateSync.multiAccount.feeExample.exampleNote')}
          </p>
          <ExampleChoiceCard
            choice="commission-only"
            onSelect={(choice) => {
              choseRef.current = true
              onOpenChange(false)
              void onChoose(choice)
            }}
          />
          <ExampleChoiceCard
            choice="all-fees"
            onSelect={(choice) => {
              choseRef.current = true
              onOpenChange(false)
              void onChoose(choice)
            }}
          />
          <button
            type="button"
            className={cn(skipButtonClassName, 'w-full')}
            onClick={() => onOpenChange(false)}
          >
            {t('tradovateSync.multiAccount.feeExample.skip')}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
