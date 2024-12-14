'use client'

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"

interface SubscriptionBadgeProps {
  plan: string | null
  endDate: Date | null
  trialEndsAt: Date | null
  status: string
  className?: string
}

export function SubscriptionBadge({ plan, endDate, trialEndsAt, status, className }: SubscriptionBadgeProps) {
  console.log('plan', plan)
  if (!plan) {
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          "px-2 py-0.5 text-xs whitespace-nowrap",
          "bg-secondary text-secondary-foreground",
          className
        )}
      >
        Free
      </Badge>
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
    if (status === 'TRIAL') {
      if (!trialDays) return {
        text: `${formattedPlan} Trial Ended`,
        variant: 'expired'
      }
      return {
        text: `${formattedPlan} Trial • ${trialDays}d left`,
        variant: 'trial'
      }
    }
    
    if (status === 'ACTIVE') {
      return {
        text: `${formattedPlan} • Active`,
        variant: 'active'
      }
    }

    if (!subscriptionDays || subscriptionDays <= 0) {
      return {
        text: `${formattedPlan} • Expired`,
        variant: 'expired'
      }
    }

    if (subscriptionDays <= 5) {
      return {
        text: `${formattedPlan} • ${subscriptionDays}d to renew`,
        variant: 'expiring'
      }
    }

    return {
      text: `${formattedPlan} • Renews ${format(new Date(endDate!), 'MMM d')}`,
      variant: 'normal'
    }
  }

  const badge = getBadgeContent()

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "px-2 py-0.5 text-xs whitespace-nowrap", 
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
  )
} 