'use client'

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { useI18n } from "@/locales/client"
import type { Subscription } from '@/prisma/generated/prisma/browser'

export function TeamSubscriptionBadge({ 
  subscription,
  className 
}: { 
  subscription: Subscription | null
  className?: string 
}) {
  const t = useI18n()

  // If no subscription data, user is on Free plan
  if (!subscription) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "px-2 py-0.5 text-xs whitespace-nowrap",
          "bg-secondary text-secondary-foreground",
          className
        )}
      >
        {t('pricing.free.name')}
      </Badge>
    )
  }

  // Compute values from subscription data
  const formattedPlan = subscription.plan || 'Free'
  const isLifetime = subscription.interval === 'lifetime'
  const isTrialing = subscription.status === 'trialing'
  const isActive = subscription.status === 'active' || subscription.status === 'ACTIVE'
  const isPastDue = subscription.status === 'past_due'
  const isIncomplete = subscription.status === 'incomplete'
  const isUnpaid = subscription.status === 'unpaid'
  const isCanceled = subscription.status === 'canceled'
  
  // Use endDate as the period end date
  const nextBillingDate = subscription.endDate
  const trialEndDate = subscription.trialEndsAt
  
  // Compute days remaining
  const trialDays = (() => {
    if (!subscription.trialEndsAt) return null
    const today = new Date()
    const trialEnd = new Date(subscription.trialEndsAt)
    const diffTime = trialEnd.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  })()
  
  const subscriptionDays = (() => {
    if (!subscription.endDate) return null
    const today = new Date()
    const endDate = new Date(subscription.endDate)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  })()

  // Get badge content based on status
  const getBadgeContent = () => {
    // Lifetime: simply show the plan name as active
    if (isLifetime) {
      return { text: formattedPlan, variant: 'active' as const, tooltip: undefined as string | undefined }
    }

    if (isTrialing) {
      if (!trialDays) {
        return { text: `${formattedPlan} • ${t('billing.status.trialing')}`, variant: 'expired' as const, tooltip: t('billing.status.incomplete_expired') }
      }
      const dateStr = trialEndDate ? format(trialEndDate, 'MMM d') : null
      return { text: `${formattedPlan} • ${trialDays}d ${t('calendar.charts.remaining')}`, variant: 'trial' as const, tooltip: dateStr ? t('billing.trialEndsIn', { date: dateStr }) : undefined }
    }

    if (isActive) {
      const next = nextBillingDate ? format(nextBillingDate, 'MMM d') : null
      return { text: `${formattedPlan}`, variant: 'active' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
    }

    if (isPastDue) {
      return { text: `${formattedPlan} • ${t('billing.status.past_due')}`, variant: 'expired' as const, tooltip: t('billing.status.past_due') }
    }

    if (isIncomplete) {
      return { text: `${formattedPlan} • ${t('billing.status.incomplete')}`, variant: 'expiring' as const, tooltip: t('billing.status.incomplete') }
    }

    if (isUnpaid) {
      return { text: `${formattedPlan} • ${t('billing.status.unpaid')}`, variant: 'expired' as const, tooltip: t('billing.status.unpaid') }
    }

    if (isCanceled) {
      const next = nextBillingDate ? format(nextBillingDate, 'MMM d') : null
      if (!subscriptionDays || subscriptionDays <= 0) {
        return { text: `${formattedPlan} • ${t('billing.status.canceled')}`, variant: 'expired' as const, tooltip: t('billing.subscriptionCancelled') }
      }
      return { text: `${formattedPlan} • ${t('billing.scheduledToCancel')}`, variant: 'expiring' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
    }

    // Handle unknown status - show the plan name with a generic status
    const next = nextBillingDate ? format(nextBillingDate, 'MMM d') : null
    return { text: `${formattedPlan}`, variant: 'normal' as const, tooltip: next ? t('billing.dates.nextBilling', { date: next }) : undefined }
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
