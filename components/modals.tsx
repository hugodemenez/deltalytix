'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useUserStore } from '@/store/user-store'
import ImportButton from '../app/[locale]/dashboard/components/import/import-button'
import { useI18n } from "@/locales/client"
import { signOut } from '@/server/auth'
import PricingPlans from '@/components/pricing-plans'
import { redirect, useSearchParams } from 'next/navigation'
import OnboardingModal from './onboarding-modal'
import { AccountGroupBoard } from '@/app/[locale]/dashboard/components/filters/account-group-board'
import { useModalStateStore } from '@/store/modal-state-store'
import { useTradesStore } from '@/store/trades-store'
import { toast } from 'sonner'

export default function Modals() {
  const user = useUserStore((state) => state.user)
  const isLoading = useUserStore((state) => state.isLoading)
  const trades = useTradesStore((state) => state.trades)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [isAlreadySubscribedOpen, setIsAlreadySubscribedOpen] = useState(false)
  const [isTradesDialogOpen, setIsTradesDialogOpen] = useState(false)
  const t = useI18n()
  const searchParams = useSearchParams()
  const { accountGroupBoardOpen, setAccountGroupBoardOpen } = useModalStateStore()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'already_subscribed') {
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        setIsAlreadySubscribedOpen(true)
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (!isLoading && !isPaywallOpen) {
      if (!trades) {
        console.warn('No trades available. Please add some trades to see the dashboard content.');
        // Use requestAnimationFrame to defer state update
        requestAnimationFrame(() => {
          setIsTradesDialogOpen(true)
        })
      }
    }
  }, [trades, isPaywallOpen, isLoading])

  // Handle loading toast
  const loadingToastRef = useRef<string | number | null>(null)
  
  useEffect(() => {
    if (isLoading && !loadingToastRef.current) {
      // Show loading toast
      const toastId = toast.loading(t('loading.trades'))
      loadingToastRef.current = toastId
    } else if (!isLoading && loadingToastRef.current) {
      // Dismiss loading toast
      toast.dismiss(loadingToastRef.current)
      loadingToastRef.current = null
    }
  }, [isLoading, t])

  const handlePaywallClose = useCallback(() => {
    setIsPaywallOpen(false);
    // Update timestamp when user manually closes the modal
    localStorage.setItem('paywall_last_shown', Date.now().toString());
  }, []);

  const handleOnboardingDismiss = useCallback(() => {
    // Open import trades dialog if user has no trades
    // Use a slightly longer delay to ensure onboarding state has updated
    setTimeout(() => {
      // Check current trades state - trades is initialized as empty array []
      const currentTrades = useTradesStore.getState().trades
      const currentIsLoading = useUserStore.getState().isLoading
      const hasNoTrades = !currentTrades || currentTrades.length === 0
      
      console.log('Onboarding dismissed - checking trades:', { 
        tradesCount: currentTrades?.length || 0, 
        isLoading: currentIsLoading,
        willOpen: hasNoTrades && !currentIsLoading 
      })
      
      if (hasNoTrades && !currentIsLoading) {
        setIsTradesDialogOpen(true)
      }
    }, 300)
  }, [])

  if (!user) return null
  return (
    <>
      <OnboardingModal onDismiss={handleOnboardingDismiss} />

      {/* Tooltip Portal for Sheet */}
      <div id="sheet-tooltip-portal" className="fixed inset-0 pointer-events-none z-100" />
      
      {/* Account Group Board */}
      <Sheet open={accountGroupBoardOpen} onOpenChange={setAccountGroupBoardOpen}>
        <SheetContent side="right" className="w-[90vw] sm:w-[800px] sm:max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('filters.manageAccounts')}</SheetTitle>
            <SheetDescription>
              {t('filters.manageAccountsDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AccountGroupBoard/>
          </div>
        </SheetContent>
      </Sheet>
      

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
              onClick={() => {
                setTimeout(() => {
                  redirect('/dashboard/billing')
                }, 100)
                  setIsAlreadySubscribedOpen(false)
              }}
            >
              {t('modals.subscription.manage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show import trades dialog if no trades, regardless of isFirstConnection when explicitly opened */}
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