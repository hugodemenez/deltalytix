'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/locales/client'
import { translateTradovateFeeType } from '@/lib/translation-utils'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_INCLUDED_FEE_TYPES,
  TRADOVATE_FEE_TYPE_KEYS,
} from '@/app/[locale]/dashboard/components/import/tradovate/sync/fee-types'

const secondaryButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-sm border border-black/20 px-3 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5'

const primaryButtonClassName =
  'inline-flex h-9 items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-4 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

export function TradovateFeeConfigDialog({
  open,
  accountLabel,
  initialFeeTypes,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean
  accountLabel: string
  initialFeeTypes: Record<string, boolean>
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onSave: (includedFeeTypes: Record<string, boolean>) => void | Promise<void>
}) {
  const t = useI18n()
  const [feeState, setFeeState] = useState<Record<string, boolean>>(
    initialFeeTypes
  )

  useEffect(() => {
    if (open) {
      setFeeState({ ...DEFAULT_INCLUDED_FEE_TYPES, ...initialFeeTypes })
    }
  }, [open, initialFeeTypes])

  const allSelected = TRADOVATE_FEE_TYPE_KEYS.every((key) => feeState[key])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-sm border-black/10 dark:border-white/10"
        data-testid="tradovate-fee-config-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-normal tracking-tight">
            {t('tradovateSync.multiAccount.feeConfigTitle', {
              accountId: accountLabel,
            })}
          </DialogTitle>
          <DialogDescription className="text-black/55 dark:text-white/55">
            {t('tradovateSync.multiAccount.feesToIncludeDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {TRADOVATE_FEE_TYPE_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`connections-fee-${key}`}
                  checked={!!feeState[key]}
                  onCheckedChange={(checked) =>
                    setFeeState((prev) => ({
                      ...prev,
                      [key]: checked === true,
                    }))
                  }
                />
                <Label
                  htmlFor={`connections-fee-${key}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {translateTradovateFeeType(t, key)}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={() =>
                setFeeState(
                  Object.fromEntries(
                    TRADOVATE_FEE_TYPE_KEYS.map((key) => [key, !allSelected])
                  )
                )
              }
            >
              {allSelected
                ? t('tradovateSync.multiAccount.deselectAllFees')
                : t('tradovateSync.multiAccount.selectAllFees')}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={cn(primaryButtonClassName)}
                disabled={saving}
                onClick={() => void onSave(feeState)}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
