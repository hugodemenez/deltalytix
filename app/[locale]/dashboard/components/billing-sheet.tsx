'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check } from 'lucide-react'
import { useCurrentLocale, useI18n } from '@/locales/client'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBillingCurrency } from '@/hooks/use-billing-currency'
import {
  availableBillingPeriods,
  billingLookupKey,
  billingPeriodCharge,
  billingPeriodMonthlyEquivalent,
  formatBillingAmount,
  isLifetimeSubscription,
  type BillingPeriod,
} from '@/lib/billing-plan-catalog'
import { changeBillingPlan } from '@/lib/billing-plan-change.client'

function planIsPaid(planName: string | undefined): boolean {
  if (!planName) return false
  const normalized = planName.trim().toLowerCase()
  return Boolean(normalized) && normalized !== 'free' && normalized !== 'basic'
}

/**
 * Compact billing sheet backed by the same catalog and plan-change path as
 * PricingPlans.
 * Desktop: right drawer. Mobile: bottom sheet.
 */
export function BillingSheet() {
  const t = useI18n()
  const locale = useCurrentLocale()
  const isMobile = useIsMobile()
  const { currency } = useBillingCurrency()
  const open = useModalStateStore((state) => state.billingSheetOpen)
  const setOpen = useModalStateStore((state) => state.setBillingSheetOpen)
  const subscription = useStripeSubscriptionStore(
    (state) => state.stripeSubscription
  )
  const isLoading = useStripeSubscriptionStore((state) => state.isLoading)
  const [selected, setSelected] = useState<BillingPeriod>('monthly')
  const [changeLoading, setChangeLoading] = useState(false)
  const [pendingLifetime, setPendingLifetime] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  const currentLabel = subscription?.plan?.name?.trim() || t('pricing.free.name')
  const isPaid = planIsPaid(subscription?.plan?.name)
  const isLifetime = isLifetimeSubscription(subscription)

  const periods = useMemo(
    () => availableBillingPeriods(subscription),
    [subscription]
  )
  const effectiveSelected = periods.includes(selected)
    ? selected
    : (periods[0] ?? selected)

  useEffect(() => {
    if (typeof window === 'undefined') return
    void import('@/lib/referral-storage').then(({ getReferralCode }) => {
      setReferralCode(getReferralCode())
    })
  }, [])

  const periodLabel = (period: BillingPeriod) => {
    switch (period) {
      case 'monthly':
        return t('pricing.monthly')
      case 'quarterly':
        return t('pricing.quarterly')
      case 'yearly':
        return t('pricing.yearly')
      case 'lifetime':
        return t('pricing.lifetime')
    }
  }

  const periodDetail = (period: BillingPeriod) => {
    if (period === 'lifetime') return t('pricing.oneTimePayment')

    const monthly = formatBillingAmount(
      billingPeriodMonthlyEquivalent(period),
      currency,
      locale
    )
    if (period === 'monthly') {
      return `${monthly} / ${t('pricing.month')}`
    }

    const total = formatBillingAmount(
      billingPeriodCharge(period),
      currency,
      locale
    )
    return period === 'quarterly'
      ? `${monthly} / ${t('pricing.month')} · ${t('pricing.billedQuarterly', { total })}`
      : `${monthly} / ${t('pricing.month')} · ${t('pricing.billedYearly', { total })}`
  }

  const executeChange = async (period: BillingPeriod) => {
    setChangeLoading(true)
    try {
      const result = await changeBillingPlan({
        lookupKey: billingLookupKey(period, currency),
        hasSubscription: Boolean(subscription),
        referralCode,
      })
      if (result.status === 'switched') {
        toast.success(t('billing.planSwitched'), {
          description: t('billing.planSwitchedDescription'),
        })
        window.location.reload()
      } else if (result.status === 'error') {
        toast.error(t('billing.error'), { description: result.error })
      }
    } catch {
      toast.error(t('billing.error'), {
        description: t('billing.planSwitchError'),
      })
    } finally {
      setChangeLoading(false)
    }
  }

  const requestChange = (period: BillingPeriod) => {
    if (period === 'lifetime' && subscription) {
      setPendingLifetime(true)
      return
    }
    void executeChange(period)
  }

  return (
    <>
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
              {isLifetime
                ? t('dashboard.billingSheet.lifetimeOwned')
                : isPaid
                  ? `${t('dashboard.billingSheet.fullAccess')} · ${subscription ? periodLabel(
                      subscription.plan.interval === 'month'
                        ? 'monthly'
                        : subscription.plan.interval === 'quarter'
                          ? 'quarterly'
                          : 'yearly'
                    ) : ''}`
                  : t('dashboard.billingSheet.limitedWidgets')}
            </p>
          </div>

          {isLifetime ? (
            <div className="rounded-xl border border-[#E2E5DF] bg-[#F7F7F4] px-4 py-4 dark:border-border dark:bg-muted/30">
              <p className="text-sm font-medium text-[#171917] dark:text-foreground">
                {t('dashboard.billingSheet.noLifetimeChangesTitle')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.billingSheet.noLifetimeChangesDescription')}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="text-xs font-semibold tracking-[0.08em] text-[#686D67] uppercase dark:text-muted-foreground">
                {subscription
                  ? t('dashboard.billingSheet.availableChanges')
                  : t('dashboard.billingSheet.availablePlans')}
              </p>
              {periods.map((period) => {
                const isSelected = effectiveSelected === period
                const price = formatBillingAmount(
                  billingPeriodCharge(period),
                  currency,
                  locale
                )
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelected(period)}
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
                          {t('pricing.plus.name')} · {periodLabel(period)}
                        </span>
                        {period === 'lifetime' ? (
                          <span className="rounded-full bg-[#EFF5EC] px-2 py-0.5 text-[10px] font-medium text-[#3E7550] dark:bg-[#243028] dark:text-[#9BC4A8]">
                            {t('pricing.lifetimeAccess')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                        {periodDetail(period)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-base font-semibold tabular-nums text-[#171917] dark:text-foreground">
                        {price}
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

        {!isLifetime && periods.length > 0 && (
          <div className="shrink-0 border-t border-[#E2E5DF] px-5 py-4 dark:border-border">
            <Button
              type="button"
              disabled={changeLoading || isLoading}
              onClick={() => requestChange(effectiveSelected)}
              className="h-11 w-full rounded-xl bg-[#181A18] text-white hover:bg-[#181A18]/90 dark:bg-white dark:text-[#181A18]"
            >
              {changeLoading
                ? t('billing.switching')
                : subscription
                  ? effectiveSelected === 'lifetime'
                    ? t('pricing.upgradeToLifetime')
                    : t('billing.changePlan')
                  : t('pricing.trialPeriod')}
            </Button>
            <p className="mt-2 text-center text-xs text-[#686D67] dark:text-muted-foreground">
              {periodDetail(effectiveSelected)}
            </p>
          </div>
        )}
        </SheetContent>
      </Sheet>

      <Dialog open={pendingLifetime} onOpenChange={setPendingLifetime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pricing.lifetimeUpgrade.title')}</DialogTitle>
            <DialogDescription>
              {t('pricing.lifetimeUpgrade.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t('pricing.lifetimeUpgrade.warning')}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-yellow-700 dark:text-yellow-300">
                  <li>
                    {t(
                      'pricing.lifetimeUpgrade.warningPoints.currentPlan'
                    )}
                  </li>
                  <li>
                    {t(
                      'pricing.lifetimeUpgrade.warningPoints.immediateCancel'
                    )}
                  </li>
                  <li>
                    {t(
                      'pricing.lifetimeUpgrade.warningPoints.oneTimePayment'
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingLifetime(false)}
              disabled={changeLoading}
            >
              {t('pricing.lifetimeUpgrade.cancel')}
            </Button>
            <Button
              onClick={() => {
                setPendingLifetime(false)
                void executeChange('lifetime')
              }}
              disabled={changeLoading}
            >
              {changeLoading
                ? t('billing.lifetimeUpgrade')
                : t('pricing.lifetimeUpgrade.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
