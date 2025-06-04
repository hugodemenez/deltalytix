'use client'

import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { useI18n } from "@/locales/client"
import NumberFlow from '@number-flow/react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"

type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

type PlanPrice = {
  yearly: number;
  quarterly: number;
  monthly: number;
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

  const plans: Plans = {
    basic: {
      name: t('pricing.basic.name'),
      description: t('pricing.basic.description'),
      price: { yearly: 0, quarterly: 0, monthly: 0 },
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
      price: {
        yearly: 300,
        quarterly: 82.5,
        monthly: 29.99
      },
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
    const [pricing, setPricing] = useState(0)
    useEffect(() => {
      setPricing(billingPeriod === 'yearly' ? plan.price.yearly / 12 : billingPeriod === 'quarterly' ? plan.price.quarterly / 3 : plan.price.monthly)
    }, [billingPeriod, plan.price])
    const t = useI18n()
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
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">{t('pricing.billingPeriod')}</span>
                <div className="flex gap-2">
                  <Button
                    variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillingPeriod('monthly')}
                  >
                    {t('pricing.monthly')}
                  </Button>
                  <Button
                    variant={billingPeriod === 'quarterly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillingPeriod('quarterly')}
                  >
                    {t('pricing.quarterly')}
                  </Button>
                  <Button
                    variant={billingPeriod === 'yearly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillingPeriod('yearly')}
                  >
                    {t('pricing.yearly')}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {billingPeriod === 'monthly'
                  ? t('pricing.monthlyFlexibility')
                  : billingPeriod === 'yearly'
                    ? t('pricing.billedYearly', { total: plan.price.yearly })
                    : t('pricing.billedQuarterly', { total: plan.price.quarterly })}
              </p>
            </div>
            <div className="text-4xl font-bold mb-4">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">€</span>
                <span className="text-4xl font-bold">
                  <NumberFlow
                    suffix={`/${t('pricing.month')}`}
                    value={pricing}
                    digits={{ 1: { max: 2 } }}
                    format={{ minimumIntegerDigits: 2 }}
                  />
                </span>
              </div>
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
            <form action={'/api/stripe/create-checkout-session'} method='POST' className='w-full' onSubmit={(e) => {
              const form = e.currentTarget;
              if (window.tolt_referral) {
                const referralInput = document.createElement('input');
                referralInput.type = 'hidden';
                referralInput.name = 'referral';
                referralInput.value = window.tolt_referral;
                form.appendChild(referralInput);
              }
            }}>
              <input type="hidden" name="lookup_key" value={`plus_${billingPeriod}`} />
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