'use client'

import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { useStripeSubscriptionStore } from '@/store/stripe-subscription-store'
import { useModalStateStore } from '@/store/modal-state-store'
import { resolvePlanLabel } from './plan-label'

/**
 * Compact Free / paid plan chip beside the Account trigger.
 * Opens the billing sheet (right on desktop, bottom on mobile).
 */
export function PlanChip({ className }: { className?: string }) {
  const t = useI18n()
  const stripeSubscription = useStripeSubscriptionStore(
    (state) => state.stripeSubscription
  )
  const isLoading = useStripeSubscriptionStore((state) => state.isLoading)
  const setBillingSheetOpen = useModalStateStore(
    (state) => state.setBillingSheetOpen
  )

  const { label, isFree } = resolvePlanLabel(
    stripeSubscription?.plan?.name,
    stripeSubscription?.plan?.interval,
    t('pricing.free.name'),
    t('pricing.lifetime')
  )

  return (
    <button
      type="button"
      onClick={() => setBillingSheetOpen(true)}
      aria-label={t('dashboard.planChip.aria', { plan: label })}
      className={cn(
        'inline-flex h-7 shrink-0 items-center rounded-[4px] border border-[#E5E5E5] px-2.5 text-xs font-medium text-[#171717] transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] dark:border-border dark:text-foreground',
        isLoading && 'opacity-60',
        isFree
          ? 'bg-[#F5F5F5] dark:bg-muted'
          : 'bg-white dark:bg-background',
        className
      )}
    >
      {isLoading ? t('pricing.loading') : label}
    </button>
  )
}
