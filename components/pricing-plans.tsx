'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useI18n } from "@/locales/client"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import Link from 'next/link'

type Plan = {
  name: string
  description: string
  features: string[]
}

function FreeFullPlanCard({ plan, isModal, onClose }: { plan: Plan; isModal?: boolean; onClose?: () => void }) {
  const t = useI18n()

  return (
    <div className="relative z-10 w-full max-w-lg mx-auto">
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
          <div className="text-center mb-6">
            <div className="flex items-baseline justify-center mb-2">
              <span className="text-4xl font-bold">0</span>
              <span className="text-sm text-muted-foreground ml-1">/{t('pricing.month')}</span>
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

        <CardFooter className="flex flex-col space-y-3">
          {isModal ? (
            <Button onClick={onClose} className="w-full">
              {t('pricing.startFree')}
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href="/authentication">{t('pricing.startFree')}</Link>
            </Button>
          )}

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

export default function PricingPlans({ isModal, onClose, trigger, currentSubscription: _currentSubscription }: PricingPlansProps) {
  const t = useI18n()
  void _currentSubscription

  const mergedFreePlan: Plan = {
    name: t('pricing.free.name'),
    description: t('pricing.plus.description'),
    features: [
      t('pricing.plus.feature1'),
      t('pricing.plus.feature2'),
      t('pricing.plus.feature3'),
      t('pricing.plus.feature4'),
      t('pricing.plus.feature5'),
      t('pricing.plus.feature6'),
    ],
  }

  const content = (
    <div className="sm:px-6">
      <div className="max-w-4xl mx-auto w-full">
        <FreeFullPlanCard plan={mergedFreePlan} isModal={isModal} onClose={onClose} />
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
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return content
} 