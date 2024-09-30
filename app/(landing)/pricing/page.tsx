'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X } from "lucide-react"

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

  const plans: Plans = {
    basic: {
      name: "Basic",
      description: "Discover the power of Deltalytix with our Basic plan. Perfect for beginners and those who want to get started with trading analytics.",
      price: { annual: 348, monthly: 34 },
      features: [
        "Can add up to 1 account",
        "Data Storage allowed up to 3 months of trading",
        "Mentor Mode",
      ]
    },
    premium: {
      name: "Premium",
      description: "Unlock the full potential of Deltalytix with our Premium plan. Ideal for serious traders who want to take their trading to the next level.",
      price: { annual: 468, monthly: 49 },
      features: [
        "Unlimited Accounts",
        "Unlimited Data Storage",
        "Mentor Mode",
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
        <h1 className="text-4xl font-bold text-center mb-4">Pricing</h1>
        <p className="text-xl text-center text-gray-600 mb-12">Store, explore and improve your trading data with the right plan for your needs.</p>

        <Tabs defaultValue="annual" className="w-full max-w-3xl mx-auto mb-12">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="annual" onClick={() => setBillingPeriod('annual')}>Annual Billing</TabsTrigger>
            <TabsTrigger value="monthly" onClick={() => setBillingPeriod('monthly')}>Monthly Billing</TabsTrigger>
          </TabsList>
          <p className="text-sm text-center text-gray-500 mt-2">
            {billingPeriod === 'annual' ? 'Save up to 25% with annual billing' : 'Flexible monthly billing'}
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
              <Card className="relative bg-background">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-4">
                    ${billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly}
                    <span className="text-lg font-normal text-gray-500">
                      /{billingPeriod === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-gray-500 mb-4">
                      Equivalent to ${(plan.price.annual / 12).toFixed(2)}/month
                    </p>
                  )}
                  <p className="text-sm text-green-500 mb-4">
                    {billingPeriod === 'annual' ? `Save $${plan.price.monthly * 12 - plan.price.annual} per year` : ''}
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
                  <form action={'/stripe/create-checkout-session'} method='POST'>
                    <input type="hidden" name="lookup_key" value={`${plan.name.toLowerCase()}-${billingPeriod}`} />
                    <Button type="submit" className="w-full">{key === 'premium' ? 'Get Started' : 'Try Basic'}</Button>
                  </form>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer">Does Deltalytix trade for me?</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">No, Deltalytix is not a brokerage. You execute trades on your broker and then transfer the data into Deltalytix to track and analyze your trading performance.</p>
            </details>
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer">How secure is Deltalytix?</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Your data security is our top priority. Deltalytix does not sell or advertise your data, and we employ industry-standard security measures to protect your information.</p>
            </details>
          </div>
        </div>
      </section>

    </div>
  )
}