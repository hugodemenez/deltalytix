'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUserData } from '@/components/context/user-data'
import LoadingOverlay from '../app/[locale]/(dashboard)/components/loading-overlay'
import ImportButton from '../app/[locale]/(dashboard)/components/import/import-button'
import { useI18n } from "@/locales/client"
import { signOut } from '@/server/auth'
import PricingPlans from '@/app/[locale]/(landing)/components/pricing-plans'
import { useSearchParams } from 'next/navigation'
import OnboardingModal from './onboarding-modal'

const PAYWALL_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function Modals() {
  const { user, subscription, isLoading: userLoading, trades, isLoading: tradesLoading, isFirstConnection } = useUserData()
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isAlreadySubscribedOpen, setIsAlreadySubscribedOpen] = useState(false)
  const [isTradesDialogOpen, setIsTradesDialogOpen] = useState(false)
  const t = useI18n()
  const searchParams = useSearchParams()

  const checkSubscription = useCallback(() => {
    if (user?.email && !subscription?.isActive) {
      // Check last shown timestamp from localStorage
      const lastShown = localStorage.getItem('paywall_last_shown');
      const currentTime = Date.now();
      
      if (!isFirstConnection && (!lastShown || (currentTime - parseInt(lastShown)) > PAYWALL_COOLDOWN)) {
        console.log('[Modals] Showing paywall - User not subscribed:', { 
          email: user.email,
          plan: subscription?.plan,
          status: subscription?.status 
        });
        setIsPaywallOpen(true);
        localStorage.setItem('paywall_last_shown', currentTime.toString());
      }
    } else if (subscription?.isActive) {
      console.log('[Modals] User has active subscription:', {
        email: user?.email,
        plan: subscription.plan,
        status: subscription.status
      });
    }
  }, [user?.email, subscription, isFirstConnection]);

  useEffect(() => {
    if (!userLoading) {
      checkSubscription();
    }
  }, [checkSubscription, userLoading]);

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'already_subscribed') {
      setIsAlreadySubscribedOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!userLoading && !tradesLoading && !isPaywallOpen) {
      if (!trades) {
        console.warn('No trades available. Please add some trades to see the dashboard content.');
        return
      }
      setIsTradesDialogOpen(trades?.length === 0)
    }
  }, [userLoading, tradesLoading, trades, isPaywallOpen])

  const handlePaywallClose = useCallback(() => {
    setIsPaywallOpen(false);
    // Update timestamp when user manually closes the modal
    localStorage.setItem('paywall_last_shown', Date.now().toString());
  }, []);

  return (
    <>
      {(userLoading || tradesLoading) && <LoadingOverlay />}
      <OnboardingModal />
      

      <Dialog open={isAlreadySubscribedOpen} onOpenChange={setIsAlreadySubscribedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('modals.subscription.title')}</DialogTitle>
            <DialogDescription>
              {t('modals.subscription.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.href = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL || ''}
            >
              {t('modals.subscription.manage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!isFirstConnection && (
        <Dialog open={isTradesDialogOpen} onOpenChange={setIsTradesDialogOpen}>
          <DialogContent>
            <DialogHeader>
            <DialogTitle>{t('modals.noTrades.title')}</DialogTitle>
            <DialogDescription>
              {t('modals.noTrades.description')}
            </DialogDescription>
          </DialogHeader>
          <ImportButton />
        </DialogContent>
      </Dialog>
      )}

      <Dialog 
        open={isPaywallOpen} 
        onOpenChange={handlePaywallClose}
      >
        <DialogContent className="sm:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">{t('pricing.chooseYourPlan')}</DialogTitle>
            <DialogDescription className="text-center text-base sm:text-lg">
              {t('pricing.subscribeToAccess')}
            </DialogDescription>
          </DialogHeader>
          
          <PricingPlans 
            isModal={true} 
            onClose={() => setIsPaywallOpen(false)} 
          />

          <div className="mt-4 text-center">
            <Button variant='link' onClick={async()=> await signOut()}>
              {t('modals.changeAccount')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}