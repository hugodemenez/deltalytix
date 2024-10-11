'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X } from "lucide-react"
import { useUser } from '@/components/context/user-data'
import { getIsSubscribed } from '@/app/[locale]/(dashboard)/server/subscription'
import { useTrades } from '@/components/context/trades-data'
import LoadingOverlay from './loading-overlay'
import ImportButton from './import-csv/import-button'
import { useI18n } from "@/locales/client"
import { signOut } from '@/server/auth'

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



export default function Modals() {
  const { user } = useUser()
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual')
  const { trades, isLoading } = useTrades()
  const [isTradesDialogOpen, setIsTradesDialogOpen] = useState(false)
  const t = useI18n()


  const checkSubscription = useCallback(async () => {
    if (user?.email) {
      const isSubscribed = await getIsSubscribed(user.email);
      setIsPaywallOpen(!isSubscribed);
    }
  }, [user?.email]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

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


  useEffect(() => {
    if (!isLoading && !isPaywallOpen) {
      setIsTradesDialogOpen(trades.length === 0)
    }
  }, [isLoading, trades.length])

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <Dialog open={isTradesDialogOpen} onOpenChange={setIsTradesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Trades Available</DialogTitle>
            <DialogDescription>
              There are currently no trades to display. Please add some trades to see the dashboard content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ImportButton />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPaywallOpen}>
        <DialogContent className="sm:max-w-[900px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">{t('pricing.chooseYourPlan')}</DialogTitle>
            <DialogDescription className="text-center text-base sm:text-lg">
              {t('pricing.subscribeToAccess')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="annual" className="w-full max-w-3xl mx-auto mb-4 sm:mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="annual" onClick={() => setBillingPeriod('annual')}>{t('pricing.annual')}</TabsTrigger>
              <TabsTrigger value="monthly" onClick={() => setBillingPeriod('monthly')}>{t('pricing.monthly')}</TabsTrigger>
            </TabsList>
            <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2">
              {billingPeriod === 'annual' ? t('pricing.annualSavings') : t('pricing.monthlyFlexibility')}
            </p>
          </Tabs>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-8 max-w-5xl mx-auto">
            {Object.entries(plans).map(([key, plan]) => (
              <Card key={key} className={`${key === 'premium' ? 'border-primary shadow-lg' : ''} flex flex-col relative`}>
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm sm:text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-4">
                    ${billingPeriod === 'annual' ? plan.price.annual : plan.price.monthly}
                    <span className="text-base sm:text-lg font-normal text-muted-foreground">
                      {billingPeriod === 'annual' ? t('pricing.perYear') : t('pricing.perMonth')}
                    </span>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4">
                      {t('pricing.equivalentTo', { price: (plan.price.annual / 12).toFixed(2) })}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-green-500 mb-2 sm:mb-4">
                    {billingPeriod === 'annual' ? t('pricing.annualSavingsAmount', { amount: plan.price.monthly * 12 - plan.price.annual }) : ''}
                  </p>
                  <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        {key === 'premium' || index < 2 ? (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
                        ) : (
                          <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mr-2" />
                        )}
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <form action={'/stripe/create-checkout-session'} method='POST' className="w-full">
                    <input type="hidden" name="lookup_key" value={`${plan.name.toLowerCase()}-${billingPeriod}`} />
                    <Button type="submit" className="w-full text-sm sm:text-base">
                      {key === 'premium' ? t('pricing.getStarted') : t('pricing.tryBasic')}
                    </Button>
                  </form>
                </CardFooter>
                {key === 'premium' && (
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold py-1 px-2 rounded">
                    {t('pricing.mostPopular')}
                  </div>
                )}
              </Card>
            ))}
          </div>
            <Button variant='link' onClick={async()=> await signOut()}>
              Change account
            </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}