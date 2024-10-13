'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X } from "lucide-react"
import { useI18n } from "@/locales/client"

type BillingPeriod = 'annual' | 'monthly';

type PlanPrice = {
  annual: number;
  monthly: number;
};

type Plan = {
  name: string;
  description: string;
  price: PlanPrice;
  features: string[];
};

type Plans = {
  [key: string]: Plan;
};

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const t = useI18n()

  const plans: Plans = {
    basic: {
      name: t('pricing.basic.name'),
      description: t('pricing.basic.description'),
      price: { annual: 348, monthly: 34 },
      features: [
        t('pricing.basic.feature1'),
        t('pricing.basic.feature2'),
        t('pricing.basic.feature3'),
      ]
    },
    premium: {
      name: t('pricing.premium.name'),
      description: t('pricing.premium.description'),
      price: { annual: 468, monthly: 49 },
      features: [
        t('pricing.premium.feature1'),
        t('pricing.premium.feature2'),
        t('pricing.premium.feature3'),
      ]
    }
  }

  const handlePlanSelection = (planName: string) => {
    setSelectedPlan(planName)
    setIsModalOpen(true)
  }

  return (
    <div>
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">{t('pricing.heading')}</h1>
        <p className="text-xl text-center text-gray-600 mb-12">{t('pricing.subheading')}</p>

        <Tabs defaultValue="annual" className="w-full max-w-3xl mx-auto mb-12">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="annual" onClick={() => setBillingPeriod('annual')}>{t('pricing.annual')}</TabsTrigger>
            <TabsTrigger value="monthly" onClick={() => setBillingPeriod('monthly')}>{t('pricing.monthly')}</TabsTrigger>
          </TabsList>
          <p className="text-sm text-center text-gray-500 mt-2">
            {billingPeriod === 'annual' ? t('pricing.annualSavings') : t('pricing.monthlyFlexibility')}
          </p>
        </Tabs>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {Object.entries(plans).map(([key, plan]) => (
            <div key={key} className={`relative ${key === 'premium' ? 'z-10' : ''}`}>
              {key === 'premium' && (
                <>
                  <span className="absolute inset-[-8px] bg-[rgba(50,169,151,0.15)] dark:bg-[hsl(var(--chart-1)/0.15)] rounded-[14.5867px] -z-10"></span>
                  <span className="absolute inset-[-4px] bg-[rgba(50,169,151,0.25)] dark:bg-[hsl(var(--chart-1)/0.25)] rounded-[14.5867px] -z-20"></span>
                  <span className="absolute inset-0 shadow-[0_18.2333px_27.35px_-5.47px_rgba(0,0,0,0.1),0_7.29333px_10.94px_-7.29333px_rgba(0,0,0,0.1)] dark:shadow-[0_18.2333px_27.35px_-5.47px_hsl(var(--chart-1)/0.1),0_7.29333px_10.94px_-7.29333px_hsl(var(--chart-1)/0.1)] rounded-[14.5867px] -z-30"></span>
                </>
              )}
              <Card className="relative bg-background h-full">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-4">
                    ${billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly}
                    <span className="text-lg font-normal text-gray-500">
                      /{billingPeriod === 'annual' ? t('pricing.year') : t('pricing.month')}
                    </span>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-gray-500 mb-4">
                      {t('pricing.equivalentTo', { price: (plan.price.annual / 12).toFixed(2) })}
                    </p>
                  )}
                  <p className="text-sm text-green-500 mb-4">
                    {billingPeriod === 'annual' ? t('pricing.annualSavingsAmount', { amount: (plan.price.monthly * 12 - plan.price.annual) }) : ''}
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        {key === 'premium' || index < 2 ? (
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <form action={'/api/stripe/create-checkout-session'} method='POST'>
                    <input type="hidden" name="lookup_key" value={`${plan.name.toLowerCase()}-${billingPeriod}`} />
                    <Button type="submit" className="w-full">{key === 'premium' ? t('pricing.getStarted') : t('pricing.tryBasic')}</Button>
                  </form>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">{t('pricing.faq.heading')}</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer">{t('pricing.faq.question1')}</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t('pricing.faq.answer1')}</p>
            </details>
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer">{t('pricing.faq.question2')}</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t('pricing.faq.answer2')}</p>
            </details>
          </div>
        </div>
      </section>
    </div>
  )
}