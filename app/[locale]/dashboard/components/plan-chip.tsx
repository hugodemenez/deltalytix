'use client'

import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { useStripeSubscriptionStore } from '@/store/stripe-subscription-store'
import { useModalStateStore } from '@/store/modal-state-store'

function resolvePlanLabel(
  planName: string | undefined,
  interval: string | undefined,
  freeLabel: string,
  lifetimeLabel: string
): { label: string; isFree: boolean } {
  if (interval === 'lifetime') {
    return { label: lifetimeLabel, isFree: false }
  }
  if (!planName) {
    return { label: freeLabel, isFree: true }
  }
  const normalized = planName.trim().toLowerCase()
  if (!normalized || normalized === 'free' || normalized === 'basic') {
    return { label: freeLabel, isFree: true }
  }
  return { label: planName, isFree: false }
}

/**
 * Compact Free / paid plan chip beside the avatar.
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
        'inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-medium transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96]',
        isLoading && 'opacity-60',
        isFree
          ? 'bg-[#EFF5EC] text-[#3E7550] dark:bg-[#243028] dark:text-[#9BC4A8]'
          : 'bg-[#181A18] text-white dark:bg-white dark:text-[#181A18]',
        className
      )}
    >
      {isLoading ? t('pricing.loading') : label}
    </button>
  )
}
