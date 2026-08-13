'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  collectSubscriptionFeedback,
  updateSubscription,
} from '@/server/billing'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { useStripeSubscriptionStore } from '@/store/stripe-subscription-store'
import { toast } from 'sonner'
import { BillingPlanList } from './billing-plan-list'
import { useBillingCurrency } from '@/hooks/use-billing-currency'

export default function BillingManagement() {
  const t = useI18n()
  const locale = useCurrentLocale()
  const { currency } = useBillingCurrency()
  const subscription = useStripeSubscriptionStore(
    (state) => state.stripeSubscription
  )
  const isLoading = useStripeSubscriptionStore((state) => state.isLoading)
  const refreshSubscription = useStripeSubscriptionStore(
    (state) => state.refreshSubscription
  )
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [feedback, setFeedback] = useState('')

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(
      locale === 'fr' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    )

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100)

  const handleSubscriptionAction = async (
    action: 'resume' | 'cancel'
  ) => {
    if (!subscription?.id) return

    try {
      const result = await updateSubscription(action, subscription.id)
      if (!result.success) throw new Error(result.error)

      if (action === 'cancel') {
        await collectSubscriptionFeedback(
          'cancellation',
          cancellationReason,
          feedback
        )
      }
      await refreshSubscription()
      toast.success(t('billing.planSwitchedDescription'))
    } catch {
      toast.error(t('billing.error'), {
        description: t('billing.planSwitchError'),
      })
    }
  }

  const canManageRecurring =
    !isLoading &&
    subscription?.plan.interval !== 'lifetime' &&
    (subscription?.status === 'active' || subscription?.status === 'trialing')
  const portalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL
  const historyTitle = subscription
    ? t('dashboard.billingPage.billingHistory')
    : t('dashboard.billingPage.invoices')
  const invoicePlanLabel =
    subscription?.plan.interval === 'lifetime'
      ? t('dashboard.billingPage.lifetimeInvoiceLabel')
      : t('dashboard.billingPage.recurringInvoiceLabel', {
          period:
            subscription?.plan.interval === 'year'
              ? t('pricing.yearly')
              : subscription?.plan.interval === 'quarter'
                ? t('pricing.quarterly')
                : t('pricing.monthly'),
        })

  return (
    <div className="space-y-8">
      <BillingPlanList
        variant="page"
        defaultPeriod="yearly"
        contentClassName="gap-4"
        footerClassName="pt-0"
      />

      <section>
        <div className="mb-3">
          <h2 className="text-xs font-medium text-[#686D67] dark:text-muted-foreground">
            {historyTitle}
          </h2>
        </div>
        <div className="overflow-hidden rounded-[4px] border border-[#E5E5E5] bg-white dark:border-border dark:bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : subscription?.invoices?.length ? (
            <div className="divide-y divide-[#E5E5E5] dark:divide-border">
              {subscription.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {invoicePlanLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
                      {formatDate(invoice.created)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatAmount(invoice.amount_paid)}
                    </span>
                    {invoice.hosted_invoice_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-[4px]"
                        asChild
                      >
                        <Link href={invoice.hosted_invoice_url} target="_blank">
                          {t('billing.viewInvoice')}
                        </Link>
                      </Button>
                    ) : null}
                    {invoice.invoice_pdf ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-[4px]"
                        asChild
                      >
                        <Link href={invoice.invoice_pdf} target="_blank">
                          {t('billing.downloadPdf')}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm font-medium text-[#171717] dark:text-foreground">
                {t('dashboard.billingPage.noInvoicesTitle')}
              </p>
              <p className="mt-1 text-sm text-[#686D67] dark:text-muted-foreground">
                {t('dashboard.billingPage.noInvoicesDescription')}
              </p>
            </div>
          )}
        </div>
      </section>

      {canManageRecurring ? (
        <section>
          <div className="mb-3">
            <h2 className="text-xs font-medium text-[#686D67] dark:text-muted-foreground">
              {t('billing.manageSubscription')}
            </h2>
          </div>
          <div className="flex flex-col gap-3 rounded-[4px] border border-[#E5E5E5] bg-white p-4 dark:border-border dark:bg-card sm:flex-row sm:items-center">
            {subscription.cancel_at_period_end ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-[4px]"
                onClick={() => void handleSubscriptionAction('resume')}
              >
                {t('billing.resumeSubscription')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-[4px] text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                {t('billing.cancelSubscription')}
              </Button>
            )}
            {portalUrl ? (
              <Button
                variant="outline"
                className="rounded-[4px]"
                asChild
              >
                <Link href={portalUrl}>{t('billing.managePaymentMethod')}</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : !isLoading && !subscription ? (
        <p className="text-sm text-[#A3A3A3]">
          {t('dashboard.billingPage.freeManagementUnavailable')}
        </p>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="rounded-[4px]">
          <DialogHeader>
            <DialogTitle>{t('pricing.cancelSubscription.title')}</DialogTitle>
            <DialogDescription>
              {t('pricing.cancelSubscription.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block space-y-2 text-sm">
              <span className="font-medium">
                {t('billing.cancellationReason')}
              </span>
              <select
                className="w-full rounded-[4px] border border-[#E5E5E5] bg-white px-3 py-2 text-base dark:border-border dark:bg-background sm:text-sm"
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
              >
                <option value="">{t('billing.selectReason')}</option>
                <option value="too_expensive">
                  {t('billing.reasons.tooExpensive')}
                </option>
                <option value="missing_features">
                  {t('billing.reasons.missingFeatures')}
                </option>
                <option value="not_using">
                  {t('billing.reasons.notUsing')}
                </option>
                <option value="switching">
                  {t('billing.reasons.switching')}
                </option>
                <option value="other">{t('billing.reasons.other')}</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">
                {t('billing.additionalFeedback')}
              </span>
              <textarea
                className="min-h-24 w-full rounded-[4px] border border-[#E5E5E5] bg-white px-3 py-2 text-base dark:border-border dark:bg-background sm:text-sm"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={t('billing.feedbackPlaceholder')}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[4px]"
              onClick={() => setCancelOpen(false)}
            >
              {t('pricing.cancelSubscription.cancel')}
            </Button>
            <Button
              variant="destructive"
              className="rounded-[4px]"
              onClick={() => {
                setCancelOpen(false)
                void handleSubscriptionAction('cancel')
              }}
            >
              {t('pricing.cancelSubscription.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
