'use client'

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
import { useI18n } from "@/locales/client"

interface SubscriptionBadgeProps {
  plan: string | null
  endDate: Date | null
  trialEndsAt: Date | null
  status: string
  className?: string
}

export function SubscriptionBadge({ plan, endDate, trialEndsAt, status, className }: SubscriptionBadgeProps) {
  const t = useI18n()

  if (!plan) {
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

  // Clean up plan name by taking only what's before underscore and capitalizing first letter
  const formattedPlan = plan.split('_')[0].charAt(0).toUpperCase() + plan.split('_')[0].slice(1).toLowerCase()
  
  const getDaysRemaining = (date: Date | null) => {
    if (!date) return null
    const today = new Date()
    const end = new Date(date)
    return differenceInDays(end, today)
  }

  const trialDays = trialEndsAt ? getDaysRemaining(trialEndsAt) : null
  const subscriptionDays = status !== 'ACTIVE' ? getDaysRemaining(endDate) : null

  // Get badge content based on status
  const getBadgeContent = () => {
    switch (status) {
      case 'TRIAL':
        if (!trialDays) return {
          text: `${formattedPlan} • ${t('billing.status.trialing')}`,
          variant: 'expired',
          tooltip: t('billing.status.incomplete_expired')
        }
        return {
          text: `${formattedPlan} • ${trialDays}d ${t('calendar.charts.remaining')}`,
          variant: 'trial',
          tooltip: t('billing.trialEndsIn', { date: format(new Date(trialEndsAt!), 'MMM d') })
        }
      
      case 'ACTIVE':
        return {
          text: `${formattedPlan}`,
          variant: 'active',
          tooltip: endDate ? t('billing.dates.nextBilling', { date: format(new Date(endDate), 'MMM d') }) : undefined
        }

      case 'PAYMENT_FAILED':
        return {
          text: `${formattedPlan} • ${t('billing.status.past_due')}`,
          variant: 'expired',
          tooltip: t('billing.status.past_due')
        }

      case 'PAYMENT_PENDING':
        return {
          text: `${formattedPlan} • ${t('billing.status.incomplete')}`,
          variant: 'expiring',
          tooltip: t('billing.status.incomplete')
        }

      case 'PAST_DUE':
        return {
          text: `${formattedPlan} • ${t('billing.status.past_due')}`,
          variant: 'expired',
          tooltip: t('billing.status.past_due')
        }

      case 'CANCELLED':
        return {
          text: `${formattedPlan} • ${t('billing.status.canceled')}`,
          variant: 'expired',
          tooltip: t('billing.subscriptionCancelled')
        }

      case 'UNPAID':
        return {
          text: `${formattedPlan} • ${t('billing.status.unpaid')}`,
          variant: 'expired',
          tooltip: t('billing.status.unpaid')
        }

      case 'EXPIRED':
        return {
          text: `${formattedPlan} • ${t('billing.status.incomplete_expired')}`,
          variant: 'expired',
          tooltip: t('billing.status.incomplete_expired')
        }

      case 'SCHEDULED_CANCELLATION':
        if (!subscriptionDays || subscriptionDays <= 0) {
          return {
            text: `${formattedPlan} • ${t('billing.status.canceled')}`,
            variant: 'expired',
            tooltip: t('billing.subscriptionCancelled')
          }
        }
        return {
          text: `${formattedPlan} • ${t('billing.scheduledToCancel')}`,
          variant: 'expiring',
          tooltip: endDate ? t('billing.dates.nextBilling', { date: format(new Date(endDate), 'MMM d') }) : undefined
        }

      default:
        if (!subscriptionDays || subscriptionDays <= 0) {
          return {
            text: `${formattedPlan} • ${t('billing.status.incomplete_expired')}`,
            variant: 'expired',
            tooltip: t('billing.status.incomplete_expired')
          }
        }

        if (subscriptionDays <= 5) {
          return {
            text: `${formattedPlan} • ${subscriptionDays}d ${t('calendar.charts.remaining')}`,
            variant: 'expiring',
            tooltip: endDate ? t('billing.dates.nextBilling', { date: format(new Date(endDate), 'MMM d') }) : undefined
          }
        }

        return {
          text: `${formattedPlan} • ${t('billing.dates.nextBilling', { date: format(new Date(endDate!), 'MMM d') })}`,
          variant: 'normal',
          tooltip: endDate ? t('billing.dates.nextBilling', { date: format(new Date(endDate), 'MMM d') }) : undefined
        }
    }
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
                "px-2 py-0.5 text-xs whitespace-nowrap cursor-help", 
                badge.variant === 'active' && plan.includes('pro') && "bg-primary text-primary-foreground",
                badge.variant === 'trial' && "bg-blue-500 text-white dark:bg-blue-400",
                badge.variant === 'expiring' && "bg-destructive text-destructive-foreground",
                badge.variant === 'expired' && "bg-destructive/80 text-destructive-foreground",
                badge.variant === 'normal' && "bg-secondary text-secondary-foreground",
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