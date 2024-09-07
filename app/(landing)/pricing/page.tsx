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

export default function PricingContent() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual')

  const plans: Plans = {
    basic: {
      name: "Basic",
      description: "Best for beginners!",
      price: { annual: 9.99, monthly: 14.99 },
      features: [
        "Can add up to 1 account",
        "Data Storage allowed up to 3 months of trading",
        "Mentor Mode",
      ]
    },
    premium: {
      name: "Premium",
      description: "Best for advanced traders!",
      price: { annual: 19.99, monthly: 29.99 },
      features: [
        "Unlimited Accounts",
        "Unlimited Data Storage",
        "Mentor Mode",
      ]
    }
  }

  return (
    <div>
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">Pricing</h1>
        <p className="text-xl text-center text-gray-600 mb-12">Analyze, improve, and advance all in one tool.</p>

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
            <Card key={key} className={key === 'premium' ? 'border-blue-500 shadow-lg' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-4">
                  ${plan.price[billingPeriod]}
                  <span className="text-lg font-normal text-gray-500">/{billingPeriod === 'annual' ? 'mo' : 'month'}</span>
                </div>
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
                <Button className="w-full">{key === 'premium' ? 'Get Started' : 'Try Basic'}</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <section className=" py-16">
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