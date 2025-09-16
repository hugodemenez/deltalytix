'use client'

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { getSubscriptionData, type SubscriptionWithPrice } from "../actions/billing"



  export function SubscriptionBadge({ className }: { className?: string }) {
    const t = useI18n()
  const locale = useCurrentLocale()
  const [stripeSubscription, setStripeSubscription] = useState<SubscriptionWithPrice | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const data = await getSubscriptionData()
        if (isMounted) setStripeSubscription(data)
      } catch {
        if (isMounted) setStripeSubscription(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    })()
    return () => { isMounted = false }
  }, [])

  if (!stripeSubscription) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/dashboard/billing">
              <Badge 
                variant="secondary" 
                className={cn(
                  "px-2 py-0.5 text-xs whitespace-nowrap cursor-pointer",
                  "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  className
                )}
              >
                {t('pricing.free.name')}
              </Badge>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('pricing.subscribeToAccess')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Derive plan label from Stripe data
  const formattedPlan = stripeSubscription.plan?.name
    ? stripeSubscription.plan.name
    : t('pricing.free.name')
  
  const getDaysRemaining = (date: Date | null) => {
    if (!date) return null
    const today = new Date()
    const end = new Date(date)
    return differenceInDays(end, today)
  }

  const trialDays = stripeSubscription.trial_end ? getDaysRemaining(new Date(stripeSubscription.trial_end * 1000)) : null
  const subscriptionDays = stripeSubscription.cancel_at_period_end && stripeSubscription.current_period_end
    ? getDaysRemaining(new Date(stripeSubscription.current_period_end * 1000))
    : null

  // Get badge content based on status
  const formatStripeDate = (timestamp?: number | null) => {
    if (!timestamp) return null
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }

  const getBadgeContent = () => {
    const status = (stripeSubscription.status || '').toLowerCase()
    const isLifetime = stripeSubscription.plan?.interval === 'lifetime'

    // Lifetime: simply show the plan name as active
    if (isLifetime) {
      return { text: formattedPlan, variant: 'active' as const, tooltip: undefined as string | undefined }
    }

    if (status === 'trialing') {
      if (!trialDays) {
        return { text: `${formattedPlan} • ${t('billing.status.trialing')}`, variant: 'expired' as const, tooltip: t('billing.status.incomplete_expired') }
      }
      const dateStr = formatStripeDate(stripeSubscription.trial_end)
      return { text: `${formattedPlan} • ${trialDays}d ${t('calendar.charts.remaining')}`, variant: 'trial' as const, tooltip: dateStr ? t('billing.trialEndsIn', { date: dateStr }) : undefined }
    }

    if (status === 'active') {
      const next = formatStripeDate(stripeSubscription.current_period_end)
      return { text: `${formattedPlan}`, variant: 'active' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
    }

    if (status === 'past_due') {
      return { text: `${formattedPlan} • ${t('billing.status.past_due')}`, variant: 'expired' as const, tooltip: t('billing.status.past_due') }
    }

    if (status === 'incomplete') {
      return { text: `${formattedPlan} • ${t('billing.status.incomplete')}`, variant: 'expiring' as const, tooltip: t('billing.status.incomplete') }
    }

    if (status === 'unpaid') {
      return { text: `${formattedPlan} • ${t('billing.status.unpaid')}`, variant: 'expired' as const, tooltip: t('billing.status.unpaid') }
    }

    if (stripeSubscription.cancel_at_period_end) {
      const next = formatStripeDate(stripeSubscription.current_period_end)
      if (!subscriptionDays || subscriptionDays <= 0) {
        return { text: `${formattedPlan} • ${t('billing.status.canceled')}`, variant: 'expired' as const, tooltip: t('billing.subscriptionCancelled') }
      }
      return { text: `${formattedPlan} • ${t('billing.scheduledToCancel')}`, variant: 'expiring' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
    }

    const next = formatStripeDate(stripeSubscription.current_period_end)
    if (!subscriptionDays || subscriptionDays <= 0) {
      return { text: `${formattedPlan} • ${t('billing.status.incomplete_expired')}`, variant: 'expired' as const, tooltip: t('billing.status.incomplete_expired') }
    }
    if (subscriptionDays <= 5) {
      return { text: `${formattedPlan} • ${subscriptionDays}d ${t('calendar.charts.remaining')}`, variant: 'expiring' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
    }
    return { text: `${formattedPlan} • ${next ? t('billing.dates.nextBilling', { date: next }) : t('billing.notApplicable')}`, variant: 'normal' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
  }

  const badge = getBadgeContent()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/dashboard/billing">
            <Badge 
              variant="secondary" 
              className={cn(
                "px-2 py-0.5 text-xs whitespace-nowrap cursor-help transition-colors", 
                badge.variant === 'active' && "bg-primary text-primary-foreground hover:bg-primary/90",
                badge.variant === 'trial' && "bg-blue-500 text-white dark:bg-blue-400 hover:bg-blue-600 dark:hover:bg-blue-500",
                badge.variant === 'expiring' && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                badge.variant === 'expired' && "bg-destructive/80 text-destructive-foreground hover:bg-destructive/70",
                badge.variant === 'normal' && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                className
              )}
            >
              {badge.text}
            </Badge>
          </Link>
        </TooltipTrigger>
        {badge.tooltip && (
          <TooltipContent>
            <p>{badge.tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
} 