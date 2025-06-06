'use client'

import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { useCurrentLocale, useI18n } from "@/locales/client"
import NumberFlow from '@number-flow/react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

// Currency detection hook
function useCurrency() {
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD')
  const [symbol, setSymbol] = useState('$')
  const locale = useCurrentLocale()

  useEffect(() => {
    // Eurozone countries as per official EU list
    const eurozoneCountries = [
      'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
    ]

    // Function to set currency based on country code
    const setCurrencyFromCountry = (countryCode: string) => {
      const upperCountryCode = countryCode.toUpperCase()
      if (eurozoneCountries.includes(upperCountryCode)) {
        console.log('Setting EUR currency for country:', upperCountryCode)
        setCurrency('EUR')
        setSymbol('€')
        return true
      } else {
        console.log('Setting USD currency for country:', upperCountryCode)
        setCurrency('USD')
        setSymbol('$')
        return true
      }
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
      console.log('Using country from cookie (set by middleware):', countryFromCookie)
      setCurrencyFromCountry(countryFromCookie)
      return
    }

    // Fallback for local development (when middleware geolocation doesn't work)
    console.log('No country cookie found, using timezone/locale fallback for local development')

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    console.log('Timezone:', timezone, 'Locale:', locale)

    // Check if timezone indicates European location
    const isEuropeanTimezone = timezone.startsWith('Europe/') ||
      ['Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Brussels', 'Vienna'].some(city => timezone.includes(city))

    // Check if locale indicates European country
    const isEuropeanLocale = /^(fr|de|es|it|nl|pt|el|fi|et|lv|lt|sl|sk|mt|cy)-/.test(locale)

    if (isEuropeanTimezone || isEuropeanLocale) {
      console.log('Fallback: Setting EUR based on timezone/locale')
      setCurrency('EUR')
      setSymbol('€')
    } else {
      console.log('Fallback: Setting USD as default')
      setCurrency('USD')
      setSymbol('$')
    }
  }, [])

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
}

export default function PricingPlans({ isModal, onClose, trigger }: PricingPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly')
  const t = useI18n()
  const { currency, symbol } = useCurrency()

  // Promotional pricing structure
  const pricing = {
    yearly: 120,
    quarterly: 45,
    monthly: 19.99,
    lifetime: 200
  }

  // Previous pricing (for line-through display)
  const previousPricing = {
    yearly: 300,
    quarterly: 82.5,
    monthly: 29.99,
    lifetime: 999
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
        t('pricing.basic.feature4'),
        t('pricing.basic.feature5'),
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
        t('pricing.plus.feature4'),
        t('pricing.plus.feature6'),
      ]
    }
  }

  function formatPrice(plan: Plan, planKey: string): number {
    if (plan.price.yearly === 0 || planKey === 'basic') {
      return 0
    }

    switch (billingPeriod) {
      case 'quarterly':
        return plan.price.quarterly / 3
      case 'yearly':
        return plan.price.yearly / 12
      case 'lifetime':
        return plan.price.lifetime
      default:
        return plan.price.monthly
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
                  {index !== 1 && index !== 0 ? (
                    <X className="h-4 w-4 text-red-500 mr-2 mt-1 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-green-500 mr-2 mt-1 shrink-0" />
                  )}
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {isModal ? (
              <Button onClick={onClose} className="">
                {t('pricing.keepBasic')}
              </Button>
            ) : (
              <Button asChild className="">
                <a href="/authentication">{t('pricing.startBasic')}</a>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

    const PlusPlan = ({ plan, billingPeriod, setBillingPeriod }: { plan: Plan, billingPeriod: BillingPeriod, setBillingPeriod: (period: BillingPeriod) => void }) => {
    const [currentPricing, setCurrentPricing] = useState(0)
    const [previousPrice, setPreviousPrice] = useState(0)
    const { currency, symbol } = useCurrency()
    
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

    const billingOptions = [
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
      },
      {
        key: 'lifetime' as BillingPeriod,
        label: t('pricing.lifetime'),
        description: t('pricing.lifetimeAccess')
      }
    ]

    return (
      <div className="relative z-10">
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
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-3 flex-col gap-3">
                <span className="text-sm font-medium">{t('pricing.billingPeriod')}</span>
                <div className="px-12">
                  <Carousel className="w-full" opts={{ loop: true, startIndex: billingPeriod === 'lifetime'?3:1 }}>
                    <CarouselContent>
                      {billingOptions.map((option) => (
                        <CarouselItem key={option.key} className="basis-1/3">
                          <Button
                            variant={billingPeriod === option.key ? 'default' : 'outline'}
                            size="sm"
                            className="w-full"
                            onClick={() => setBillingPeriod(option.key)}
                          >
                            {option.label}
                          </Button>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="-left-3" />
                    <CarouselNext className="-right-3" />
                  </Carousel>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {billingPeriod === 'monthly'
                  ? t('pricing.monthlyFlexibility')
                  : billingPeriod === 'yearly'
                    ? t('pricing.billedYearly', { total: plan.price.yearly })
                    : billingPeriod === 'lifetime'
                    ? t('pricing.lifetimeAccess')
                    : t('pricing.billedQuarterly', { total: plan.price.quarterly })}
              </p>
            </div>
                        <div className="mb-4">
              {billingPeriod === 'lifetime' ? (
                /* Lifetime pricing - no previous price comparison */
                <div className="text-center">
                  <div className="flex flex-col items-center mb-3">
                    {/* Lifetime Price */}
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold">{symbol}</span>
                      <span className="text-4xl font-bold">
                        <NumberFlow
                          value={currentPricing}
                          digits={{ 1: { max: 2 } }}
                          format={{ minimumIntegerDigits: 2 }}
                        />
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{t('pricing.oneTimePayment')}</p>
                </div>
              ) : (
                /* Recurring billing - show price comparison */
                <>
                  {/* Price comparison on same line */}
                  <div className="flex items-center justify-center gap-4 mb-3">
                    {/* Previous price (crossed out) */}
                    <div className="text-lg text-muted-foreground relative">
                      <span className="inline-block">
                        {symbol}
                        <NumberFlow
                          value={previousPrice}
                          digits={{ 1: { max: 2 } }}
                          format={{ minimumIntegerDigits: 2 }}
                        />
                      </span>
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-[1px] bg-current"></div>
                      </div>
                    </div>
                    
                    <div className="text-muted-foreground">→</div>
                    
                    {/* Current promotional pricing */}
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-green-600">{symbol}</span>
                      <span className="text-2xl font-bold text-green-600">
                        <NumberFlow
                          suffix={`/${t('pricing.month')}`}
                          value={currentPricing}
                          digits={{ 1: { max: 2 } }}
                          format={{ minimumIntegerDigits: 2 }}
                        />
                      </span>
                    </div>
                    
                    {/* Savings badge positioned to the right */}
                    <span className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                      -{Math.round(((previousPrice - currentPricing) / previousPrice) * 100)}%
                    </span>
                  </div>
                  
                  {/* Offer validity */}
                  <div className="text-center">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      🔥 {t('pricing.offerValidUntil')}
                    </p>
                  </div>
                </>
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
          </CardContent>
          <CardFooter>
                          <form action={'/api/stripe/create-checkout-session'} method='POST' className='w-full'>
                <input type="hidden" name="lookup_key" value={`plus_${billingPeriod}_${currency.toLowerCase()}`} />
                <Button type="submit" className="w-full">
                  {t('pricing.trialPeriod')}
                </Button>
              </form>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const PricingContent = () => (
    <div>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <FreePlan plan={plans.basic} isModal={isModal} onClose={onClose} />
        <PlusPlan plan={plans.plus} billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} />
      </div>
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