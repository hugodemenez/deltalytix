'use client'

import { useCurrentLocale, useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useModalStateStore } from '@/store/modal-state-store'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BillingPlanList } from '@/app/[locale]/dashboard/billing/components/billing-plan-list'

/**
 * Responsive billing chrome. Plan/catalog behavior is shared with the full
 * billing page through BillingPlanList.
 */
export function BillingSheet() {
  const t = useI18n()
  const locale = useCurrentLocale()
  const isMobile = useIsMobile()
  const open = useModalStateStore((state) => state.billingSheetOpen)
  const setOpen = useModalStateStore((state) => state.setBillingSheetOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        overlayClassName="bg-black/15 dark:bg-black/70"
        className={cn(
          'flex flex-col gap-0 overflow-hidden bg-[#FFFFFF] p-0 dark:bg-background',
          isMobile
            ? 'h-[min(92dvh,720px)] rounded-t-[4px] border-t border-[#E5E5E5]'
            : 'w-full border-l border-[#E5E5E5] sm:max-w-[420px]'
        )}
      >
        {isMobile ? (
          <div
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20"
            aria-hidden
          />
        ) : null}
        <SheetHeader className="space-y-1 border-b border-[#E5E5E5] px-5 py-4 text-left dark:border-border">
          <SheetTitle className="text-lg font-semibold leading-tight tracking-[-0.025em] text-[#171717] dark:text-foreground">
            {t('dashboard.billingSheet.title')}
          </SheetTitle>
          <SheetDescription className="text-sm text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.billingSheet.description')}
          </SheetDescription>
        </SheetHeader>

        <BillingPlanList
          className="min-h-0 flex-1"
          contentClassName="overflow-y-auto px-5 py-5 pb-8 scroll-pb-8"
          footerClassName="px-5 py-4"
          fullSettingsHref={`/${locale}/dashboard/billing`}
          onOpenFullSettings={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
