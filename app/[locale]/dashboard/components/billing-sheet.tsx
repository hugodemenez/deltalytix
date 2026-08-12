'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useModalStateStore } from '@/store/modal-state-store'
import { useStripeSubscriptionStore } from '@/store/stripe-subscription-store'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type UpgradeOption = 'monthly' | 'lifetime'

function planIsPaid(planName: string | undefined): boolean {
  if (!planName) return false
  const normalized = planName.trim().toLowerCase()
  return Boolean(normalized) && normalized !== 'free' && normalized !== 'basic'
}

/**
 * Compact billing sheet: current plan + monthly/lifetime upgrade cards.
 * Desktop: right drawer. Mobile: bottom sheet.
 */
export function BillingSheet() {
  const t = useI18n()
  const isMobile = useIsMobile()
  const open = useModalStateStore((state) => state.billingSheetOpen)
  const setOpen = useModalStateStore((state) => state.setBillingSheetOpen)
  const subscription = useStripeSubscriptionStore(
    (state) => state.stripeSubscription
  )
  const isLoading = useStripeSubscriptionStore((state) => state.isLoading)
  const [selected, setSelected] = useState<UpgradeOption>('lifetime')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const currentLabel = subscription?.plan?.name?.trim() || t('pricing.free.name')
  const isPaid = planIsPaid(subscription?.plan?.name)
  const isLifetime = subscription?.plan?.interval === 'lifetime'

  const options = useMemo(
    () =>
      [
        {
          id: 'monthly' as const,
          title: t('dashboard.billingSheet.monthlyTitle'),
          subtitle: t('dashboard.billingSheet.monthlySubtitle'),
          price: t('dashboard.billingSheet.monthlyPrice'),
        },
        {
          id: 'lifetime' as const,
          title: t('dashboard.billingSheet.lifetimeTitle'),
          subtitle: t('dashboard.billingSheet.lifetimeSubtitle'),
          price: t('dashboard.billingSheet.lifetimePrice'),
          badge: t('dashboard.billingSheet.bestValue'),
        },
      ] as const,
    [t]
  )

  const startCheckout = async (period: UpgradeOption) => {
    if (isLifetime) {
      toast.error(t('billing.error'), {
        description: t('billing.lifetimeAlreadyOwned'),
      })
      return
    }

    setCheckoutLoading(true)
    try {
      // Currency is resolved server-side from geo/cookie; lookup_key uses usd as
      // the client default — create-checkout-session remaps when needed.
      const currency =
        typeof document !== 'undefined' &&
        document.cookie.includes('user-country=')
          ? // Prefer EUR for eurozone cookie when present; otherwise USD.
            /user-country=(FR|DE|ES|IT|NL|BE|AT|PT|IE|FI|GR|LU|SK|SI|EE|LV|LT|MT|CY)/i.test(
              document.cookie
            )
            ? 'eur'
            : 'usd'
          : 'usd'
      const lookupKey = `plus_${period}_${currency}`

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/stripe/create-checkout-session'
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'lookup_key'
      input.value = lookupKey
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    } catch {
      toast.error(t('billing.error'))
      setCheckoutLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col gap-0 overflow-hidden bg-[#FFFFFF] p-0 dark:bg-background',
          isMobile
            ? 'h-[min(92dvh,720px)] rounded-t-2xl border-t border-[#E2E5DF]'
            : 'w-full sm:max-w-md'
        )}
      >
        {isMobile && (
          <div
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20"
            aria-hidden
          />
        )}
        <SheetHeader className="space-y-1 border-b border-[#E2E5DF] px-5 py-4 text-left dark:border-border">
          <SheetTitle className="text-lg font-semibold tracking-tight text-[#171917] dark:text-foreground">
            {t('dashboard.billingSheet.title')}
          </SheetTitle>
          <SheetDescription className="text-sm text-[#686D67] dark:text-muted-foreground">
            {isMobile
              ? t('dashboard.billingSheet.mobileDescription', {
                  plan: currentLabel,
                })
              : t('dashboard.billingSheet.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div
            className={cn(
              'rounded-xl border px-4 py-3',
              isPaid
                ? 'border-[#E2E5DF] bg-[#F2F2EE] dark:border-border dark:bg-muted/40'
                : 'border-transparent bg-[#EFF5EC] dark:bg-[#243028]'
            )}
          >
            <p className="text-[10px] font-semibold tracking-[0.08em] text-[#3E7550] uppercase dark:text-[#9BC4A8]">
              {t('dashboard.billingSheet.currentPlan')}
            </p>
            <p className="mt-1 text-base font-semibold text-[#171917] dark:text-foreground">
              {isLoading ? t('pricing.loading') : currentLabel}
            </p>
            <p className="mt-0.5 text-sm text-[#686D67] dark:text-muted-foreground">
              {isPaid
                ? t('dashboard.billingSheet.fullAccess')
                : t('dashboard.billingSheet.limitedWidgets')}
            </p>
          </div>

          {!isLifetime && (
            <div className="grid gap-3">
              {options.map((option) => {
                const isSelected = selected === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelected(option.id)}
                    className={cn(
                      'relative flex w-full items-start justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors dark:bg-background',
                      isSelected
                        ? 'border-[#181A18] dark:border-white'
                        : 'border-[#E2E5DF] hover:border-black/30 dark:border-border dark:hover:border-white/40'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#171917] dark:text-foreground">
                          {option.title}
                        </span>
                        {'badge' in option && option.badge ? (
                          <span className="rounded-full bg-[#EFF5EC] px-2 py-0.5 text-[10px] font-medium text-[#3E7550] dark:bg-[#243028] dark:text-[#9BC4A8]">
                            {option.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                        {option.subtitle}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-base font-semibold tabular-nums text-[#171917] dark:text-foreground">
                        {option.price}
                      </span>
                      {isSelected ? (
                        <Check
                          className="h-4 w-4 text-[#181A18] dark:text-white"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <Link
            href="/dashboard/billing"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-[#3E7550] underline-offset-2 hover:underline dark:text-[#9BC4A8]"
          >
            {t('dashboard.billingSheet.manageFull')}
          </Link>
        </div>

        {!isLifetime && (
          <div className="shrink-0 border-t border-[#E2E5DF] px-5 py-4 dark:border-border">
            <Button
              type="button"
              disabled={checkoutLoading || isLoading}
              onClick={() => startCheckout(selected)}
              className="h-11 w-full rounded-xl bg-[#181A18] text-white hover:bg-[#181A18]/90 dark:bg-white dark:text-[#181A18]"
            >
              {checkoutLoading
                ? t('billing.switching')
                : selected === 'lifetime'
                  ? t('dashboard.billingSheet.upgradeLifetime')
                  : t('dashboard.billingSheet.upgradeMonthly')}
            </Button>
            <p className="mt-2 text-center text-xs text-[#686D67] dark:text-muted-foreground">
              {selected === 'lifetime'
                ? t('dashboard.billingSheet.orMonthly')
                : t('dashboard.billingSheet.cancelAnytime')}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
