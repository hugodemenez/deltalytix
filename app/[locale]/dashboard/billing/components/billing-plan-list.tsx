'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check } from 'lucide-react'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import { useStripeSubscriptionStore } from '@/store/stripe-subscription-store'
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
import {
  backToWorkPeriodDisplay,
  type BackToWorkPricingDisplay,
} from '@/lib/back-to-work-promo'
import { getBackToWorkPricingDisplay } from '@/server/back-to-work-pricing'
import { changeBillingPlan } from '@/lib/billing-plan-change.client'

function planIsPaid(planName: string | undefined): boolean {
  if (!planName) return false
  const normalized = planName.trim().toLowerCase()
  return Boolean(normalized) && normalized !== 'free' && normalized !== 'basic'
}

export function BillingPlanList({
  variant = 'sheet',
  defaultPeriod = 'monthly',
  className,
  contentClassName,
  footerClassName,
  fullSettingsHref,
  onOpenFullSettings,
}: {
  variant?: 'sheet' | 'page'
  defaultPeriod?: BillingPeriod
  className?: string
  contentClassName?: string
  footerClassName?: string
  fullSettingsHref?: string
  onOpenFullSettings?: () => void
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const { currency } = useBillingCurrency()
  const subscription = useStripeSubscriptionStore(
    (state) => state.stripeSubscription
  )
  const isLoading = useStripeSubscriptionStore((state) => state.isLoading)
  const [selected, setSelected] = useState<BillingPeriod>(defaultPeriod)
  const [changeLoading, setChangeLoading] = useState(false)
  const [pendingLifetime, setPendingLifetime] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [promo, setPromo] = useState<BackToWorkPricingDisplay | null>(null)

  const isLifetime = isLifetimeSubscription(subscription)
  const currentPeriod: BillingPeriod | null = !subscription
    ? null
    : subscription.plan.interval === 'lifetime'
      ? 'lifetime'
      : subscription.plan.interval === 'year'
        ? 'yearly'
        : subscription.plan.interval === 'quarter'
          ? 'quarterly'
          : 'monthly'
  const currentPeriodLabel =
    currentPeriod === 'lifetime'
      ? t('pricing.lifetime')
      : currentPeriod === 'yearly'
        ? t('pricing.yearly')
        : currentPeriod === 'quarterly'
          ? t('pricing.quarterly')
          : currentPeriod === 'monthly'
            ? t('pricing.monthly')
            : null
  const currentLabel = subscription
    ? `${t('pricing.plus.name')} · ${currentPeriodLabel}`
    : t('pricing.free.name')
  const isPaid = planIsPaid(subscription?.plan?.name)
  const isPage = variant === 'page'
  const periods = useMemo(
    () => availableBillingPeriods(subscription),
    [subscription]
  )
  const effectiveSelected = periods.includes(selected)
    ? selected
    : (periods[0] ?? selected)
  const currentPrice = !subscription
    ? formatBillingAmount(0, currency, locale)
    : formatBillingAmount(
        billingPeriodCharge(currentPeriod ?? 'monthly'),
        currency,
        locale
      )
  const renewalDate =
    subscription && !isLifetime
      ? new Date(subscription.current_period_end * 1000).toLocaleDateString(
          locale === 'fr' ? 'fr-FR' : 'en-GB',
          { day: 'numeric', month: 'short', year: 'numeric' }
        )
      : null
  const pageCurrentMeta = !subscription
    ? t('dashboard.billingPage.freeIncluded', { price: currentPrice })
    : isLifetime
      ? t('dashboard.billingPage.lifetimeLocked')
      : t('dashboard.billingPage.recurringRenews', {
          price: currentPrice,
          date: renewalDate ?? '',
        })

  useEffect(() => {
    if (typeof window === 'undefined') return
    void import('@/lib/referral-storage').then(({ getReferralCode }) => {
      setReferralCode(getReferralCode())
    })
  }, [])

  useEffect(() => {
    if (subscription) return
    void getBackToWorkPricingDisplay().then(setPromo)
  }, [subscription])

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
    const offer = subscription
      ? undefined
      : backToWorkPeriodDisplay(promo, period)
    const monthlyEquivalent =
      offer?.saleMonthlyEquivalent ?? billingPeriodMonthlyEquivalent(period)
    if (isPage) {
      switch (period) {
        case 'monthly':
          return t('dashboard.billingPage.monthlyDetail')
        case 'quarterly':
          return t('dashboard.billingPage.quarterlyDetail', {
            price: formatBillingAmount(monthlyEquivalent, currency, locale),
          })
        case 'yearly':
          return t('dashboard.billingPage.yearlyDetail', {
            price: formatBillingAmount(monthlyEquivalent, currency, locale),
          })
        case 'lifetime':
          return t('dashboard.billingPage.lifetimeDetail')
      }
    }

    switch (period) {
      case 'monthly':
        return t('dashboard.billingSheet.monthlyDetail')
      case 'quarterly':
        return t('dashboard.billingSheet.quarterlyDetail')
      case 'yearly':
        return t('dashboard.billingSheet.yearlyDetail')
      case 'lifetime':
        return t('dashboard.billingSheet.lifetimeDetail')
    }
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
      <div className={cn('flex min-h-0 flex-col', className)}>
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-4',
            contentClassName
          )}
        >
          <div>
            {isPage ? (
              <p className="mb-2 text-xs font-medium text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.billingSheet.currentPlan')}
              </p>
            ) : null}
            <div
              className={cn(
                'rounded-[4px] border border-[#E5E5E5] px-4 py-3 dark:border-border',
                isPaid
                  ? 'bg-white dark:bg-muted/40'
                  : 'bg-[#F7FBF5] dark:bg-[#243028]',
                (isPage || isLifetime) &&
                  'flex items-center justify-between gap-4'
              )}
            >
              {isPage ? (
                <>
                  <p className="text-base font-semibold text-[#171917] dark:text-foreground">
                    {isLoading ? t('pricing.loading') : currentLabel}
                  </p>
                  <p className="shrink-0 text-sm text-[#686D67] dark:text-muted-foreground">
                    {pageCurrentMeta}
                  </p>
                </>
              ) : (
                <div>
                  <p className="text-xs font-medium tracking-[-0.01em] text-[#686D67] dark:text-muted-foreground">
                    {t('dashboard.billingSheet.currentPlan')}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#171917] dark:text-foreground">
                    {isLoading ? t('pricing.loading') : currentLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-[#686D67] dark:text-muted-foreground">
                    {isLifetime
                      ? t('dashboard.billingSheet.lifetimePaid')
                      : isPaid
                        ? `${t('dashboard.billingSheet.fullAccess')} · ${currentPeriodLabel}`
                        : t('dashboard.billingSheet.limitedWidgets')}
                    {(isPaid || isPage) && currentPrice
                      ? ` · ${currentPrice}`
                      : ''}
                  </p>
                </div>
              )}
              {!isPage && isLifetime ? (
                <span className="shrink-0 rounded-[4px] border border-[#CFE0D2] bg-[#EFF5EC] px-2 py-1 text-xs font-medium text-[#3E7550]">
                  {t('billing.status.active')}
                </span>
              ) : null}
            </div>
          </div>

          {isLifetime ? (
            <div className="rounded-[4px] border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-4 dark:border-border dark:bg-muted/30">
              <p className="text-sm font-medium text-[#171917] dark:text-foreground">
                {isPage
                  ? t('dashboard.billingSheet.allSet')
                  : t('dashboard.billingSheet.noLifetimeChangesTitle')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#686D67] dark:text-muted-foreground">
                {isPage
                  ? t('dashboard.billingPage.lifetimeLockedDescription')
                  : t('dashboard.billingSheet.noLifetimeChangesDescription')}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <p
                className={cn(
                  'text-xs font-medium tracking-[-0.01em] text-[#686D67] dark:text-muted-foreground',
                  isPage && 'tracking-normal'
                )}
              >
                {isPage
                  ? subscription
                    ? t('dashboard.billingPage.changePlan')
                    : t('dashboard.billingPage.upgradeWithPlus')
                  : subscription
                    ? t('dashboard.billingSheet.availableChanges')
                    : t('dashboard.billingSheet.availablePlans')}
              </p>
              {periods.map((period) => {
                const isSelected = effectiveSelected === period
                const offer = subscription
                  ? undefined
                  : backToWorkPeriodDisplay(promo, period)
                const listPrice = formatBillingAmount(
                  billingPeriodCharge(period),
                  currency,
                  locale
                )
                const price = formatBillingAmount(
                  offer?.saleCharge ?? billingPeriodCharge(period),
                  currency,
                  locale
                )
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelected(period)}
                    className={cn(
                      'relative flex w-full items-start justify-between gap-3 rounded-[4px] border bg-white px-4 py-3 text-left transition-colors dark:bg-background',
                      isSelected
                        ? 'border-[#181A18] dark:border-white'
                        : 'border-[#E5E5E5] hover:border-black/30 dark:border-border dark:hover:border-white/40'
                    )}
                  >
                    {isPage ? (
                      <span
                        className={cn(
                          'mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border border-[#D4D4D4]',
                          isSelected && 'border-[#171717]'
                        )}
                        aria-hidden
                      >
                        {isSelected ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#171717]" />
                        ) : null}
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#171917] dark:text-foreground">
                          {t('pricing.plus.name')} · {periodLabel(period)}
                        </span>
                        {offer?.offerActive ? (
                          <span className="rounded-full bg-[#EFF5EC] px-2 py-0.5 text-[10px] font-medium text-[#3E7550] dark:bg-[#243028] dark:text-[#9BC4A8]">
                            {t('pricing.backToWork.badge')}
                          </span>
                        ) : null}
                        {(isPage && period === 'yearly') ||
                        (!isPage &&
                          (period === 'yearly' ||
                            period === 'lifetime')) ? (
                          <span className="rounded-full bg-[#EFF5EC] px-2 py-0.5 text-[10px] font-medium text-[#3E7550] dark:bg-[#243028] dark:text-[#9BC4A8]">
                            {isPage
                              ? t('dashboard.billingSheet.bestValue')
                              : period === 'yearly'
                                ? t('dashboard.billingSheet.save')
                                : t('dashboard.billingSheet.bestValue')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                        {periodDetail(period)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {offer?.saleCharge !== undefined ? (
                        <s className="text-xs tabular-nums text-[#686D67] dark:text-muted-foreground">
                          {listPrice}
                        </s>
                      ) : null}
                      <span className="text-base font-semibold tabular-nums text-[#171917] dark:text-foreground">
                        {price}
                      </span>
                      {isSelected && !isPage ? (
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

          {fullSettingsHref ? (
            <Link
              href={fullSettingsHref}
              onClick={onOpenFullSettings}
              className="inline-flex min-h-10 items-center text-sm font-medium text-[#3E7550] underline-offset-2 hover:underline dark:text-[#9BC4A8]"
            >
              {t('dashboard.billingSheet.manageFull')}
            </Link>
          ) : null}
        </div>

        {!isLifetime && periods.length > 0 ? (
          <div
            className={cn(
              'shrink-0 border-t border-[#E5E5E5] dark:border-border',
              footerClassName
            )}
          >
            <Button
              type="button"
              disabled={changeLoading || isLoading}
              onClick={() => requestChange(effectiveSelected)}
              className="h-11 w-full rounded-[4px] bg-[#181A18] text-white hover:bg-[#181A18]/90 dark:bg-white dark:text-[#181A18]"
            >
              {changeLoading
                ? t('billing.switching')
                : subscription
                  ? t(
                      isPage
                        ? 'dashboard.billingPage.switchToPeriod'
                        : 'dashboard.billingSheet.changeToPeriod',
                      { period: periodLabel(effectiveSelected) }
                    )
                  : t('dashboard.billingSheet.upgradeToPeriod', {
                      period: periodLabel(effectiveSelected),
                    })}
            </Button>
            <p className="mt-2 text-center text-xs text-[#686D67] dark:text-muted-foreground">
              {isPage
                ? subscription
                  ? t('dashboard.billingPage.currentPlanNote', {
                      periods: periods.map(periodLabel).join(' · '),
                      current: currentPeriodLabel ?? '',
                    })
                  : t('dashboard.billingPage.freeCadenceNote')
                : periodDetail(effectiveSelected)}
            </p>
          </div>
        ) : null}

        {isLifetime && !isPage ? (
          <div
            className={cn(
              'shrink-0 border-t border-[#E5E5E5] dark:border-border',
              footerClassName
            )}
          >
            <p className="text-center text-sm font-medium text-[#171717] dark:text-foreground">
              {t('dashboard.billingSheet.allSet')}
            </p>
            <p className="mt-1 text-center text-xs text-[#686D67] dark:text-muted-foreground">
              {t('dashboard.billingSheet.lifetimeIncludesFuture')}
            </p>
          </div>
        ) : null}
      </div>

      <Dialog open={pendingLifetime} onOpenChange={setPendingLifetime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pricing.lifetimeUpgrade.title')}</DialogTitle>
            <DialogDescription>
              {t('pricing.lifetimeUpgrade.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[4px] border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
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
