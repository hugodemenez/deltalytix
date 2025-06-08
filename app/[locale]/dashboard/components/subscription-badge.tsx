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
import { useUserStore } from "@/store/user-store"



  export function SubscriptionBadge({ className }: { className?: string }) {
    const t = useI18n()
  const  subscription = useUserStore(state => state.subscription)

  if (!subscription || !subscription.plan.toUpperCase().includes('PLUS')) {
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
  const formattedPlan = subscription.plan.toLowerCase().includes('plus') ? 'Plus' : 'Free'
  
  const getDaysRemaining = (date: Date | null) => {
    if (!date) return null
    const today = new Date()
    const end = new Date(date)
    return differenceInDays(end, today)
  }

  const trialDays = subscription.trialEndsAt ? getDaysRemaining(subscription.trialEndsAt) : null
  const subscriptionDays = subscription.status !== 'ACTIVE' ? getDaysRemaining(subscription.endDate) : null

  // Get badge content based on status
  const getBadgeContent = () => {
    switch (subscription.status) {
      case 'TRIAL':
        if (!trialDays) return {
          text: `${formattedPlan} • ${t('billing.status.trialing')}`,
          variant: 'expired',
          tooltip: t('billing.status.incomplete_expired')
        }
        return {
          text: `${formattedPlan} • ${trialDays}d ${t('calendar.charts.remaining')}`,
          variant: 'trial',
          tooltip: t('billing.trialEndsIn', { date: format(new Date(subscription.trialEndsAt!), 'MMM d') })
        }
      
      case 'ACTIVE':
        return {
          text: `${formattedPlan}`,
          variant: 'active',
          tooltip: subscription.endDate ? t('billing.dates.nextBilling', { date: format(new Date(subscription.endDate), 'MMM d') }) : undefined
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
          tooltip: subscription.endDate ? t('billing.dates.nextBilling', { date: format(new Date(subscription.endDate), 'MMM d') }) : undefined
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
            tooltip: subscription.endDate ? t('billing.dates.nextBilling', { date: format(new Date(subscription.endDate), 'MMM d') }) : undefined
          }
        }

        return {
          text: `${formattedPlan} • ${t('billing.dates.nextBilling', { date: format(new Date(subscription.endDate!), 'MMM d') })}`,
          variant: 'normal',
          tooltip: subscription.endDate ? t('billing.dates.nextBilling', { date: format(new Date(subscription.endDate), 'MMM d') }) : undefined
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
                "px-2 py-0.5 text-xs whitespace-nowrap cursor-help transition-colors", 
                badge.variant === 'active' && subscription.plan.toLowerCase().includes('plus') && "bg-primary text-primary-foreground hover:bg-primary/90",
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