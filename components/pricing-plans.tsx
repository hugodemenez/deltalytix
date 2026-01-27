'use client'

import React, { useCallback, useEffect, useState, startTransition } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, AlertCircle } from "lucide-react"
import { useCurrentLocale, useI18n } from "@/locales/client"
import NumberFlow from '@number-flow/react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"

// Currency detection hook
// Handles special case for French overseas territories (DOM/TOM) that use EUR currency
// but must be billed in USD due to Stripe pricing configuration limitations
function useCurrency() {
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD')
  const [symbol, setSymbol] = useState('$')
  const locale = useCurrentLocale()

  const detectCurrency = useCallback(() => {
    // Eurozone countries as per official EU list
    const eurozoneCountries = [
      'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'CH',
      // French overseas territories
      'GP', 'MQ', 'GF', 'RE', 'YT', 'PM', 'BL', 'MF', 'NC', 'PF', 'WF', 'TF'
    ]


    // Function to set currency based on country code
    const setCurrencyFromCountry = (countryCode: string) => {
      const upperCountryCode = countryCode.toUpperCase()
      startTransition(() => {
        if (eurozoneCountries.includes(upperCountryCode)) {
          setCurrency('EUR')
          setSymbol('€')
        } else {
          setCurrency('USD')
          setSymbol('$')
        }
      })
      return true
    }

    // First, try to get country from cookie (set by middleware)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }

    const countryFromCookie = getCookie('user-country')
    if (countryFromCookie) {
      setCurrencyFromCountry(countryFromCookie)
      return
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Check if timezone indicates European location
    const isEuropeanTimezone = timezone.startsWith('Europe/') ||
      ['Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Brussels', 'Vienna'].some(city => timezone.includes(city))

    // Check if locale indicates European country
    const isEuropeanLocale = /^(fr|de|es|it|nl|pt|el|fi|et|lv|lt|sl|sk|mt|cy)-/.test(locale)

    startTransition(() => {
      if (isEuropeanTimezone || isEuropeanLocale) {
        setCurrency('EUR')
        setSymbol('€')
      } else {
        setCurrency('USD')
        setSymbol('$')
      }
    })
  }, [locale])

  useEffect(() => {
    detectCurrency()
  }, [detectCurrency])

  return { currency, symbol }
}

type BillingPeriod = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

type PlanPrice = {
  yearly: number;
  quarterly: number;
  monthly: number;
  lifetime: number;
};

type Plan = {
  name: string;
  description: string;
  price: PlanPrice;
  features: string[];
  isPopular?: boolean;
  isComingSoon?: boolean;
};

type Plans = {
  [key: string]: Plan;
};

interface PricingPlansProps {
  isModal?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  currentSubscription?: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      interval: string;
    };
  } | null;
}

export default function PricingPlans({ isModal, onClose, trigger, currentSubscription }: PricingPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('lifetime')
  const [isLoading, setIsLoading] = useState(false)
  const [showLifetimeConfirm, setShowLifetimeConfirm] = useState(false)
  const [pendingLookupKey, setPendingLookupKey] = useState<string>('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const t = useI18n()
  const { currency, symbol } = useCurrency()

  // Read referral code from URL params or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/referral-storage').then(({ getReferralCode }) => {
        const ref = getReferralCode()
        if (ref) {
          setReferralCode(ref)
        }
      })
    }
  }, [])

  // Function to check if current plan matches lookup key
  const isCurrentPlan = (lookupKey: string) => {
    if (!currentSubscription) return false
    
    // Extract plan details from lookup key (e.g., "plus_yearly_eur")
    const parts = lookupKey.split('_')
    const planType = parts[0] // "plus"
    const interval = parts[1] // "yearly", "monthly", etc.
    
    // Lifetime plans are never "current" since they're one-time purchases
    // and can't be compared to recurring subscriptions
    if (interval === 'lifetime') return false
    
    // Map intervals to match subscription data
    const intervalMap: Record<string, string> = {
      'yearly': 'year',
      'monthly': 'month', 
      'quarterly': 'quarter'
    }
    
    return (
      planType.toLowerCase() === 'plus' && 
      currentSubscription.plan.name.toLowerCase().includes('plus') &&
      intervalMap[interval] === currentSubscription.plan.interval
    )
  }

  // Function to check if user has lifetime subscription
  const hasLifetimeSubscription = () => {
    return currentSubscription?.plan?.interval === 'lifetime'
  }

  // Function to check if user should be blocked from subscribing to recurring plans
  const isBlockedFromRecurring = (lookupKey: string) => {
    if (!hasLifetimeSubscription()) return false
    
    const parts = lookupKey.split('_')
    const interval = parts[1] // "yearly", "monthly", etc.
    
    // Block recurring plans if user has lifetime
    return ['yearly', 'monthly', 'quarterly'].includes(interval)
  }

  // Function to check if user should be blocked from purchasing lifetime again
  const isBlockedFromLifetime = (lookupKey: string) => {
    if (!hasLifetimeSubscription()) return false
    
    const parts = lookupKey.split('_')
    const interval = parts[1] // "yearly", "monthly", etc.
    
    // Block lifetime plans if user already has lifetime
    return interval === 'lifetime'
  }

  // Function to handle plan switching
  const handlePlanSwitch = async (lookupKey: string) => {
    if (!currentSubscription) {
      // No subscription exists, use checkout session
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/stripe/create-checkout-session'
      
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'lookup_key'
      input.value = lookupKey
      form.appendChild(input)
      
      // Add referral code if present
      if (referralCode) {
        const referralInput = document.createElement('input')
        referralInput.type = 'hidden'
        referralInput.name = 'referral'
        referralInput.value = referralCode
        form.appendChild(referralInput)
      }
      
      document.body.appendChild(form)
      form.submit()
      return
    }

    // Check if trying to switch to the same plan
    if (isCurrentPlan(lookupKey)) {
      toast.error(t('billing.error'), {
        description: t('billing.alreadyOnPlan'),
      })
      return
    }

    // Check if user has lifetime and is trying to switch to recurring plan
    if (isBlockedFromRecurring(lookupKey)) {
      toast.error(t('billing.error'), {
        description: t('billing.lifetimeNoDowngrade'),
      })
      return
    }

    // Check if user already has lifetime and is trying to purchase lifetime again
    if (isBlockedFromLifetime(lookupKey)) {
      toast.error(t('billing.error'), {
        description: t('billing.lifetimeAlreadyOwned'),
      })
      return
    }

    // Check if this is a lifetime plan - show confirmation dialog
    if (lookupKey.includes('lifetime')) {
      setPendingLookupKey(lookupKey)
      setShowLifetimeConfirm(true)
      return
    }

    await executePlanSwitch(lookupKey)
  }

  // Function to execute the actual plan switch
  const executePlanSwitch = async (lookupKey: string) => {
    setIsLoading(true)
    
    try {
      const { switchSubscriptionPlan } = await import('@/server/billing')
      const result = await switchSubscriptionPlan(lookupKey)
      
      if (result.success) {
        toast.success(t('billing.planSwitched'), {
          description: t('billing.planSwitchedDescription'),
        })
        
        // Refresh the page to update subscription data
        window.location.reload()
      } else if ('requiresCheckout' in result && result.requiresCheckout) {
        // Lifetime plans need checkout session, redirect to checkout
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = '/api/stripe/create-checkout-session'
        
        const finalLookupKey = result.lookupKey || lookupKey
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'lookup_key'
        input.value = finalLookupKey
        form.appendChild(input)
        
        // Add referral code if present
        if (referralCode) {
          const referralInput = document.createElement('input')
          referralInput.type = 'hidden'
          referralInput.name = 'referral'
          referralInput.value = referralCode
          form.appendChild(referralInput)
        }
        
        document.body.appendChild(form)
        form.submit()
      } else {
        toast.error(t('billing.error'), {
          description: result.error,
        })
      }
    } catch {
      toast.error(t('billing.error'), {
        description: t('billing.planSwitchError'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle lifetime confirmation
  const handleLifetimeConfirm = async () => {
    setShowLifetimeConfirm(false)
    await executePlanSwitch(pendingLookupKey)
  }

  // New pricing structure
  const pricing = {
    yearly: 120,
    quarterly: 45,
    monthly: 19.99,
    lifetime: 300
  }

  // Previous pricing (for line-through display)
  const previousPricing = {
    yearly: 300,
    quarterly: 82.5,
    monthly: 29.99,
    lifetime: 500
  }

  const plans: Plans = {
    basic: {
      name: t('pricing.basic.name'),
      description: t('pricing.basic.description'),
      price: { yearly: 0, quarterly: 0, monthly: 0, lifetime: 0 },
      features: [
        t('pricing.basic.feature1'),
        t('pricing.basic.feature2'),
        t('pricing.basic.feature3'),
        t('pricing.basic.feature6'),
        t('pricing.basic.feature7'),
        t('pricing.basic.feature8'),
        t('pricing.basic.feature9'),
        t('pricing.basic.feature10'),
        t('pricing.basic.feature11'),
        t('pricing.basic.feature12'),
      ]
    },
    plus: {
      name: t('pricing.plus.name'),
      description: t('pricing.plus.description'),
      price: pricing,
      isPopular: true,
      features: [
        t('pricing.plus.feature1'),
        t('pricing.plus.feature2'),
        t('pricing.plus.feature6'),
      ]
    }
  }

  const FreePlan = ({ plan, isModal, onClose }: { plan: Plan, isModal?: boolean, onClose?: () => void }) => {
    const t = useI18n()
    return (
      <div className="relative">
        <Card className="relative bg-background h-full">
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              {t('pricing.free.name')}
            </div>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  {index > 2 ? (
                    <X className="h-4 w-4 text-red-500 mr-2 mt-1 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-green-500 mr-2 mt-1 shrink-0" />
                  )}
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            {isModal ? (
              <Button onClick={onClose} className="">
                {t('pricing.keepBasic')}
              </Button>
            ) : (
              <Button asChild className="">
                <Link href="/authentication">{t('pricing.startBasic')}</Link>
              </Button>
            )}
            
            <p className="text-xs text-center text-muted-foreground">
              {t('terms.pricing.freePlanDisclaimer')}
              <Link href="/terms" className="text-primary hover:underline">
                {t('terms.pricing.termsOfService')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const PlusPlan = ({ plan, billingPeriod, setBillingPeriod, currency, symbol }: { plan: Plan, billingPeriod: BillingPeriod, setBillingPeriod: (period: BillingPeriod) => void, currency: 'USD' | 'EUR', symbol: string }) => {
    const [currentPricing, setCurrentPricing] = useState(0)
    const [previousPrice, setPreviousPrice] = useState(0)

    useEffect(() => {
      setCurrentPricing(billingPeriod === 'yearly' ? plan.price.yearly / 12 :
        billingPeriod === 'quarterly' ? plan.price.quarterly / 3 :
          billingPeriod === 'lifetime' ? plan.price.lifetime :
            plan.price.monthly)

      setPreviousPrice(billingPeriod === 'yearly' ? previousPricing.yearly / 12 :
        billingPeriod === 'quarterly' ? previousPricing.quarterly / 3 :
          billingPeriod === 'lifetime' ? previousPricing.lifetime :
            previousPricing.monthly)
    }, [billingPeriod, plan.price])

    const t = useI18n()

    const recurringBillingOptions = [
      {
        key: 'monthly' as BillingPeriod,
        label: t('pricing.monthly'),
        description: t('pricing.monthlyFlexibility')
      },
      {
        key: 'quarterly' as BillingPeriod,
        label: t('pricing.quarterly'),
        description: `${symbol}${plan.price.quarterly} billed quarterly (${symbol}${(plan.price.quarterly / 3).toFixed(2)}/month)`
      },
      {
        key: 'yearly' as BillingPeriod,
        label: t('pricing.yearly'),
        description: `${symbol}${plan.price.yearly} billed yearly (${symbol}${(plan.price.yearly / 12).toFixed(2)}/month)`
      }
    ]

    return (
      <div className="relative z-10 w-full">
        <span className="absolute inset-[-8px] bg-[rgba(50,169,151,0.15)] dark:bg-[hsl(var(--chart-1)/0.15)] rounded-[14.5867px] -z-10"></span>
        <span className="absolute inset-[-4px] bg-[rgba(50,169,151,0.25)] dark:bg-[hsl(var(--chart-1)/0.25)] rounded-[14.5867px] -z-20"></span>
        <span className="absolute inset-0 shadow-[0_18.2333px_27.35px_-5.47px_rgba(0,0,0,0.1),0_7.29333px_10.94px_-7.29333px_rgba(0,0,0,0.1)] dark:shadow-[0_18.2333px_27.35px_-5.47px_hsl(var(--chart-1)/0.1),0_7.29333px_10.94px_-7.29333px_hsl(var(--chart-1)/0.1)] rounded-[14.5867px] -z-30"></span>
        <Card className="relative bg-background h-full">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
              {t('pricing.fullVersion')}
            </span>
          </div>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 mb-4 space-y-3 dark:bg-muted/50">
              <span className="text-sm font-medium block text-center">
                {t('pricing.billingPeriod')}
              </span>

              {/* Toggle group for recurring billing options */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-background rounded-md">
                {recurringBillingOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-xs capitalize border border-transparent",
                      billingPeriod === option.key && "border-primary"
                    )}
                    onClick={() => setBillingPeriod(option.key)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Separate lifetime button */}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full flex items-center justify-center gap-2 border border-border",
                    billingPeriod === 'lifetime' && "border-primary"
                  )}
                  onClick={() => setBillingPeriod('lifetime')}
                >
                  {t('pricing.lifetimeAccess')}
                  <Badge
                    variant="secondary"
                    className="uppercase tracking-wide text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-amber-500/40 dark:border-emerald-500/50"
                  >
                    {t('pricing.limitedTimeOffer')}
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="mb-4">
              {billingPeriod === 'lifetime' ? (
                /* Lifetime pricing - show regular pricing */
                <div className="text-center">
                  <div className="flex flex-col items-center mb-3">
                    <div className="flex items-center justify-center gap-4">
                      {/* Previous price (crossed out) */}
                      <div className="text-lg text-muted-foreground relative">
                        <NumberFlow
                          prefix={currency === 'EUR' ? undefined : `${symbol}`}
                          suffix={currency === 'EUR' ? `${symbol}` : undefined}
                          value={previousPrice}
                          format={{ minimumIntegerDigits: 3 }}
                        />
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full h-px bg-current"></div>
                        </div>
                      </div>
                      <div className="text-muted-foreground">→</div>
                      {/* Current price */}
                      <div className="flex items-baseline text-4xl font-bold">
                        <NumberFlow
                          prefix={currency === 'EUR' ? undefined : `${symbol}`}
                          suffix={currency === 'EUR' ? `${symbol}` : undefined}
                          value={currentPricing}
                          format={{ minimumIntegerDigits: 3 }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      {t('pricing.oneTimePayment')}
                    </p>
                  </div>
                </div>
              ) : (
                /* Recurring billing - show regular pricing */
                <div className="text-center">
                  <div className="flex items-baseline justify-center mb-3">
                    <span className="text-4xl font-bold">
                      <NumberFlow
                        prefix={currency === 'EUR' ? undefined : `${symbol}`}
                        suffix={currency === 'EUR' ? `${symbol}/${t('pricing.month')}` : `/${t('pricing.month')}`}
                        value={currentPricing}
                        digits={{ 1: { max: 2 } }}
                        format={{ minimumIntegerDigits: 2 }}
                      />
                    </span>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {billingPeriod === 'monthly'
                      ? t('pricing.monthlyFlexibility')
                      : billingPeriod === 'yearly'
                        ? t('pricing.billedYearly', { total: plan.price.yearly })
                        : t('pricing.billedQuarterly', { total: plan.price.quarterly })}
                  </p>
                </div>
              )}
            </div>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-1 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            {/* Lifetime disclaimers */}
            {billingPeriod === 'lifetime' && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    • {t('pricing.lifetimeDisclaimer1')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • {t('pricing.lifetimeDisclaimer2')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            {(() => {
              const lookupKey = `plus_${billingPeriod}_${currency.toLowerCase()}`
              const isCurrent = isCurrentPlan(lookupKey)
              const isBlockedRecurring = isBlockedFromRecurring(lookupKey)
              const isBlockedLifetime = isBlockedFromLifetime(lookupKey)
              const isBlocked = isBlockedRecurring || isBlockedLifetime
              
              return (
                <Button 
                  onClick={() => handlePlanSwitch(lookupKey)}
                  disabled={isLoading || isCurrent || isBlocked}
                  variant={isCurrent || isBlocked ? "outline" : "default"}
                  className="w-full"
                >
                  {isLoading ? (
                    billingPeriod === 'lifetime' ? t('billing.lifetimeUpgrade') : t('billing.switching')
                  ) : 
                   isCurrent ? t('billing.currentPlan') : 
                   isBlockedLifetime ? t('billing.lifetimeOwned') :
                   isBlockedRecurring ? t('billing.lifetimeActive') :
                   currentSubscription ? (
                     billingPeriod === 'lifetime' ? t('pricing.upgradeToLifetime') || 'Upgrade to Lifetime' : t('billing.changePlan')
                   ) : t('pricing.trialPeriod')}
                </Button>
              )
            })()}
            
            <p className="text-xs text-center text-muted-foreground">
              {t('terms.pricing.disclaimer')}
              <Link href="/terms" className="text-primary hover:underline">
                {t('terms.pricing.termsOfService')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const PricingContent = () => (
    <div className="sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
        <FreePlan plan={plans.basic} isModal={isModal} onClose={onClose} />
        <PlusPlan plan={plans.plus} billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} currency={currency} symbol={symbol} />
      </div>
      
      {/* Lifetime Confirmation Dialog */}
      <Dialog open={showLifetimeConfirm} onOpenChange={setShowLifetimeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pricing.lifetimeUpgrade.title')}</DialogTitle>
            <DialogDescription>
              {t('pricing.lifetimeUpgrade.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t('pricing.lifetimeUpgrade.warning')}
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                    <li>{t('pricing.lifetimeUpgrade.warningPoints.currentPlan')}</li>
                    <li>{t('pricing.lifetimeUpgrade.warningPoints.immediateCancel')}</li>
                    <li>{t('pricing.lifetimeUpgrade.warningPoints.oneTimePayment')}</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {currentSubscription && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">{t('pricing.lifetimeUpgrade.currentSubscription')}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>{t('billing.currentPlan')}:</strong> {currentSubscription.plan.name}</p>
                  <p><strong>{t('billing.billingPeriod')}:</strong> {currentSubscription.plan.interval}</p>
                  <p><strong>{t('billing.status.active')}:</strong> {t('billing.status.active')}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLifetimeConfirm(false)}
              disabled={isLoading}
            >
              {t('pricing.lifetimeUpgrade.cancel')}
            </Button>
            <Button
              onClick={handleLifetimeConfirm}
              disabled={isLoading}
            >
              {isLoading ? t('billing.lifetimeUpgrade') : t('pricing.lifetimeUpgrade.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  if (trigger) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <PricingContent />
        </DialogContent>
      </Dialog>
    )
  }

  return <PricingContent />
} 