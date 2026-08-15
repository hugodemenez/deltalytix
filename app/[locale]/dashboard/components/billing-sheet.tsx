'use client'

import { useCurrentLocale, useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useModalStateStore } from '@/store/modal-state-store'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
 * Mobile uses the same vaul Drawer as the connection-chip picker (swipe to
 * dismiss, no close X). Desktop stays a right-side Sheet.
 */
export function BillingSheet() {
  const t = useI18n()
  const locale = useCurrentLocale()
  const isMobile = useIsMobile()
  const open = useModalStateStore((state) => state.billingSheetOpen)
  const setOpen = useModalStateStore((state) => state.setBillingSheetOpen)

  const planList = (
    <BillingPlanList
      className="min-h-0 flex-1"
      contentClassName="overflow-y-auto px-5 py-5 pb-8 scroll-pb-8"
      footerClassName="px-5 py-4"
      fullSettingsHref={`/${locale}/dashboard/billing`}
      onOpenFullSettings={() => setOpen(false)}
    />
  )

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={setOpen}
        shouldScaleBackground={false}
      >
        <DrawerContent className="max-h-[85svh] gap-0 overflow-hidden rounded-t-[4px] border-[#E5E5E5] bg-white p-0 dark:border-border dark:bg-background">
          <DrawerHeader className="space-y-1 border-b border-[#E5E5E5] px-5 py-4 text-left dark:border-border">
            <DrawerTitle className="text-lg font-semibold leading-tight tracking-[-0.025em] text-[#171717] dark:text-foreground">
              {t('dashboard.billingSheet.title')}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-[#686D67] dark:text-muted-foreground">
              {t('dashboard.billingSheet.description')}
            </DrawerDescription>
          </DrawerHeader>
          {planList}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/15 dark:bg-black/70"
        className={cn(
          'flex w-full flex-col gap-0 overflow-hidden border-l border-[#E5E5E5] bg-[#FFFFFF] p-0 dark:bg-background sm:max-w-[420px]'
        )}
      >
        <SheetHeader className="space-y-1 border-b border-[#E5E5E5] px-5 py-4 text-left dark:border-border">
          <SheetTitle className="text-lg font-semibold leading-tight tracking-[-0.025em] text-[#171717] dark:text-foreground">
            {t('dashboard.billingSheet.title')}
          </SheetTitle>
          <SheetDescription className="text-sm text-[#686D67] dark:text-muted-foreground">
            {t('dashboard.billingSheet.description')}
          </SheetDescription>
        </SheetHeader>
        {planList}
      </SheetContent>
    </Sheet>
  )
}
