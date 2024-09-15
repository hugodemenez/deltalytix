'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X } from "lucide-react"
import { useUser } from './context/user-data'
import { getIsSubscribed } from '@/app/(dashboard)/server/subscription'

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



export default function PaywallModal() {
    const {user} = useUser()
    const [isOpen, setIsOpen] = useState(false)
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual')

    const checkSubscription = useCallback(async () => {
      if (user?.email) {
          const isSubscribed = await getIsSubscribed(user.email);
          setIsOpen(!isSubscribed);
      }
  }, [user?.email]);

  useEffect(() => {
      checkSubscription();
  }, [checkSubscription]);

    const plans: Plans = {
    basic: {
      name: "Basic",
      description: "Discover the power of Deltalytix.",
      price: { annual: 348, monthly: 34 },
      features: [
        "Can add up to 1 account",
        "Data Storage allowed up to 3 months of trading",
        "Mentor Mode",
      ]
    },
    premium: {
      name: "Premium",
      description: "Unlock the full potential of Deltalytix.",
      price: { annual: 468, monthly: 49 },
      features: [
        "Unlimited Accounts",
        "Unlimited Data Storage",
        "Mentor Mode",
      ]
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-center text-lg">
            Subscribe to access all features and improve your trading performance.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="annual" className="w-full max-w-3xl mx-auto mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="annual" onClick={() => setBillingPeriod('annual')}>Annual Billing</TabsTrigger>
            <TabsTrigger value="monthly" onClick={() => setBillingPeriod('monthly')}>Monthly Billing</TabsTrigger>
          </TabsList>
          <p className="text-sm text-center text-muted-foreground mt-2">
            {billingPeriod === 'annual' ? 'Save up to 25% with annual billing' : 'Flexible monthly billing'}
          </p>
        </Tabs>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {Object.entries(plans).map(([key, plan]) => (
            <Card key={key} className={key === 'premium' ? 'border-primary shadow-lg' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-4">
                  ${billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{billingPeriod === 'annual' ? 'year' : 'month'}
                  </span>
                </div>
                {billingPeriod === 'annual' && (
                  <p className="text-sm text-muted-foreground mb-4">
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
                        <X className="h-5 w-5 text-destructive mr-2" />
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}