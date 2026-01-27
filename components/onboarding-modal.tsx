'use client'

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useData } from '@/context/data-provider'
import { useI18n, useCurrentLocale } from '@/locales/client'
import { useUserStore } from '@/store/user-store'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import PricingPlans from '@/components/pricing-plans'

interface OnboardingModalProps {
  onDismiss?: () => void
}

export default function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  const { isFirstConnection, changeIsFirstConnection } = useData()
  const t = useI18n()
  const locale = useCurrentLocale()
  const subscription = useUserStore((state) => state.subscription)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  const videoIds = {
    en: process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_ID_EN || process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_ID,
    fr: process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_ID_FR || process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_ID
  }

  useEffect(() => {
    if (!api) {
      return
    }

    // Use requestAnimationFrame to defer state update
    requestAnimationFrame(() => {
      setCurrent(api.selectedScrollSnap())
    })

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const handleClose = useCallback(async () => {
    // Only allow closing from the pricing page (slide 1)
    if (current !== 1) {
      return
    }
    try {
      changeIsFirstConnection(false)
      // Call onDismiss callback after a short delay to ensure modal is closed
      setTimeout(() => {
        onDismiss?.()
      }, 100)
    } catch (error) {
      console.error('Failed to update onboarding status:', error)
    }
  }, [current, changeIsFirstConnection, onDismiss])

  const handleGetStarted = () => {
    api?.scrollNext()
  }

  const handlePricingClose = useCallback(async () => {
    try {
      changeIsFirstConnection(false)
      // Call onDismiss callback after a short delay to ensure modal is closed
      setTimeout(() => {
        onDismiss?.()
      }, 100)
    } catch (error) {
      console.error('Failed to update onboarding status:', error)
    }
  }, [changeIsFirstConnection, onDismiss])

  // Prevent closing dialog when not on pricing page
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && current !== 1) {
      return
    }
    if (!open) {
      handleClose()
    }
  }, [current, handleClose])

  // Transform subscription data for PricingPlans component
  const currentSubscription = subscription ? {
    id: subscription.id,
    status: subscription.status,
    plan: {
      id: subscription.id,
      name: subscription.plan,
      interval: subscription.endDate ? 'year' : 'month' // Simplified, adjust based on your needs
    }
  } : null

  return (
    <Dialog open={isFirstConnection} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto p-0">
        <Carousel
          opts={{
            align: "start",
            loop: false,
            dragFree: false,
          }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {/* Welcome Page */}
            <CarouselItem className="pl-0 basis-full">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    {t('onboarding.welcome')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('onboarding.description')}
                  </DialogDescription>
                </DialogHeader>

                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black mt-6">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoIds[locale as keyof typeof videoIds]}`}
                    title="Welcome Tutorial"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleGetStarted}>
                    {t('onboarding.getStarted')}
                  </Button>
                </div>
              </div>
            </CarouselItem>

            {/* Pricing Page */}
            <CarouselItem className="pl-0 basis-full">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">
                    {t('pricing.chooseYourPlan')}
                  </DialogTitle>
                  <DialogDescription className="text-center text-base sm:text-lg">
                    {t('pricing.subscribeToAccess')}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 mb-32 sm:mb-6">
                  <PricingPlans 
                    isModal={true} 
                    onClose={handlePricingClose}
                    currentSubscription={currentSubscription}
                  />
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </DialogContent>
    </Dialog>
  )
} 