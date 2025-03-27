'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check } from "lucide-react"
import { useI18n } from "@/locales/client"
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
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const t = useI18n()

  const plans: Plans = {
    basic: {
      name: t('pricing.basic.name'),
      description: t('pricing.basic.description'),
      price: { yearly: 0, quarterly: 0, monthly: 0 },
      features: [
        t('pricing.basic.feature2'),
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
      ]
    },
    pro: {
      name: t('pricing.pro.name'),
      description: t('pricing.pro.description'),
      price: { 
        yearly: 1000,
        quarterly: 299.99,
        monthly: 99.99
      },
      isComingSoon: true,
      features: [
        t('pricing.pro.feature1'),
        t('pricing.pro.feature2'),
        t('pricing.pro.feature3'),
      ]
    }
  }

  function formatPrice(plan: Plan) {
    if (plan.price.yearly === 0) {
      return t('pricing.free')
    }

    const priceDisplay = (
      <>
        {plan.name === t('pricing.plus.name') && billingPeriod === 'monthly' ? (
          <>
            <span className="line-through text-gray-500 text-2xl mr-2">
              {t('pricing.plus.promo.originalPrice')}
            </span>
            <span className="text-red-500">
              {t('pricing.plus.promo.price')}
            </span>
            <span className="text-lg font-normal text-gray-500">
              /{t('pricing.month')}
            </span>
            <div className="text-sm font-normal text-green-500 mt-1">
              {t('pricing.plus.promo.code')}
            </div>
            <div className="text-sm font-normal text-gray-500">
              {t('pricing.plus.promo.validUntil')}
            </div>
            <div className="text-xs font-normal text-gray-400 mt-1">
              {t('pricing.plus.promo.duration')}
            </div>
          </>
        ) : (
          <>
            €{(() => {
              switch (billingPeriod) {
                case 'monthly':
                  return plan.price.monthly;
                case 'quarterly':
                  return (plan.price.quarterly / 3).toFixed(2);
                case 'yearly':
                  return (plan.price.yearly / 12).toFixed(2);
              }
            })()}
            <span className="text-lg font-normal text-gray-500">
              /{t('pricing.month')}
            </span>
            {billingPeriod !== 'monthly' && (
              <div className="text-sm font-normal text-gray-500 mt-1">
                {billingPeriod === 'yearly' 
                  ? t('pricing.billedYearly', { total: plan.price.yearly })
                  : t('pricing.billedQuarterly', { total: plan.price.quarterly })}
              </div>
            )}
          </>
        )}
      </>
    )

    return priceDisplay
  }

  const PricingContent = () => (
    <div>
      {/* Sticky container for mobile */}
      <div className="md:hidden sticky top-[64px] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 border-b">
        <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as BillingPeriod)} className="w-full max-w-3xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monthly">{t('pricing.monthly')}</TabsTrigger>
            <TabsTrigger value="quarterly">{t('pricing.quarterly')}</TabsTrigger>
            <TabsTrigger value="yearly">{t('pricing.yearly')}</TabsTrigger>
          </TabsList>
          <p className="text-sm text-center text-gray-500 mt-2">
            {billingPeriod === 'yearly' 
              ? t('pricing.yearlySavings')
              : billingPeriod === 'quarterly'
              ? t('pricing.quarterlySavings')
              : t('pricing.monthlyFlexibility')}
          </p>
        </Tabs>
      </div>

      {/* Desktop version */}
      <div className="hidden md:block">
        <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as BillingPeriod)} className="w-full max-w-3xl mx-auto mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monthly">{t('pricing.monthly')}</TabsTrigger>
            <TabsTrigger value="quarterly">{t('pricing.quarterly')}</TabsTrigger>
            <TabsTrigger value="yearly">{t('pricing.yearly')}</TabsTrigger>
          </TabsList>
          <p className="text-sm text-center text-gray-500 mt-2">
            {billingPeriod === 'yearly' 
              ? t('pricing.yearlySavings')
              : billingPeriod === 'quarterly'
              ? t('pricing.quarterlySavings')
              : t('pricing.monthlyFlexibility')}
          </p>
        </Tabs>
      </div>

      {/* Add margin top for mobile to account for sticky header */}
      <div className="mt-4 md:mt-0 grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {Object.entries(plans).map(([key, plan]) => (
          <div key={key} className={`relative ${plan.isPopular ? 'z-10' : ''}`}>
            {plan.isPopular && (
              <>
                <span className="absolute inset-[-8px] bg-[rgba(50,169,151,0.15)] dark:bg-[hsl(var(--chart-1)/0.15)] rounded-[14.5867px] -z-10"></span>
                <span className="absolute inset-[-4px] bg-[rgba(50,169,151,0.25)] dark:bg-[hsl(var(--chart-1)/0.25)] rounded-[14.5867px] -z-20"></span>
                <span className="absolute inset-0 shadow-[0_18.2333px_27.35px_-5.47px_rgba(0,0,0,0.1),0_7.29333px_10.94px_-7.29333px_rgba(0,0,0,0.1)] dark:shadow-[0_18.2333px_27.35px_-5.47px_hsl(var(--chart-1)/0.1),0_7.29333px_10.94px_-7.29333px_hsl(var(--chart-1)/0.1)] rounded-[14.5867px] -z-30"></span>
              </>
            )}
            <Card className={`relative bg-background h-full ${plan.isComingSoon ? 'opacity-70' : ''}`}>
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">
                    {t('pricing.mostPopular')}
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-4">
                  {formatPrice(plan)}
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
                {plan.isComingSoon ? (
                  <Button disabled className="">{t('pricing.comingSoon')}</Button>
                ) : key === 'basic' ? (
                  isModal ? (
                    <Button onClick={onClose} className="">
                      {t('pricing.keepBasic')}
                    </Button>
                  ) : (
                    <Button asChild className="">
                      <a href="/authentication">{t('pricing.startBasic')}</a>
                    </Button>
                  )
                ) : (
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
                    <input type="hidden" name="lookup_key" value={`${key}_${billingPeriod}`} />
                    <Button type="submit" className="w-full">
                      {key === 'plus' ? t('pricing.trialPeriod') : t('pricing.subscribe')}
                    </Button>
                  </form>
                )}
              </CardFooter>
            </Card>
          </div>
        ))}
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