'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUser } from '@/components/context/user-data'
import { getIsSubscribed } from '@/server/subscription'
import { useTrades } from '@/components/context/trades-data'
import LoadingOverlay from './loading-overlay'
import ImportButton from './import-csv/import-button'
import { useI18n } from "@/locales/client"
import { signOut } from '@/server/auth'
import PricingPlans from '@/app/[locale]/(landing)/components/pricing-plans'
import { useSearchParams } from 'next/navigation'

const PAYWALL_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function Modals() {
  const { user } = useUser()
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isAlreadySubscribedOpen, setIsAlreadySubscribedOpen] = useState(false)
  const { trades, isLoading } = useTrades()
  const [isTradesDialogOpen, setIsTradesDialogOpen] = useState(false)
  const t = useI18n()
  const searchParams = useSearchParams()

  const checkSubscription = useCallback(async () => {
    if (user?.email) {
      const isSubscribed = await getIsSubscribed(user.email);
      
      if (!isSubscribed) {
        // Check last shown timestamp from localStorage
        const lastShown = localStorage.getItem('paywall_last_shown');
        const currentTime = Date.now();
        
        if (!lastShown || (currentTime - parseInt(lastShown)) > PAYWALL_COOLDOWN) {
          setIsPaywallOpen(true);
          localStorage.setItem('paywall_last_shown', currentTime.toString());
        }
      }
    }
  }, [user?.email]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'already_subscribed') {
      setIsAlreadySubscribedOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isLoading && !isPaywallOpen) {
      if (!trades) {
        console.warn('No trades available. Please add some trades to see the dashboard content.');
        return
      }
      setIsTradesDialogOpen(trades?.length === 0)
    }
  }, [isLoading, trades, isPaywallOpen])

  const handlePaywallClose = useCallback(() => {
    setIsPaywallOpen(false);
    // Update timestamp when user manually closes the modal
    localStorage.setItem('paywall_last_shown', Date.now().toString());
  }, []);

  return (
    <>
      {isLoading && <LoadingOverlay />}
      
      <Dialog open={isAlreadySubscribedOpen} onOpenChange={setIsAlreadySubscribedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Active Subscription Found</DialogTitle>
            <DialogDescription>
              You already have an active subscription. You can manage your subscription in the customer portal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.href = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL || ''}
            >
              Manage Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTradesDialogOpen} onOpenChange={setIsTradesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Trades Available</DialogTitle>
            <DialogDescription>
              There are currently no trades to display. Please add some trades to see the dashboard content.
            </DialogDescription>
          </DialogHeader>
          <ImportButton />
        </DialogContent>
      </Dialog>

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
              Change account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}