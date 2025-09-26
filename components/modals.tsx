'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useUserStore } from '@/store/user-store'
import LoadingOverlay from '../app/[locale]/dashboard/components/loading-overlay'
import ImportButton from '../app/[locale]/dashboard/components/import/import-button'
import { useI18n } from "@/locales/client"
import { signOut } from '@/server/auth'
import PricingPlans from '@/components/pricing-plans'
import { redirect, useSearchParams } from 'next/navigation'
import OnboardingModal from './onboarding-modal'
import { AccountGroupBoard } from '@/app/[locale]/dashboard/components/filters/account-group-board'
import { useModalStateStore } from '@/store/modal-state-store'
import { useTradesStore } from '@/store/trades-store'

const PAYWALL_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function Modals() {
  const user = useUserStore((state) => state.user)
  const subscription = useUserStore((state) => state.subscription)
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
      setIsAlreadySubscribedOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isLoading && !isPaywallOpen) {
      if (!trades) {
        console.warn('No trades available. Please add some trades to see the dashboard content.');
        setIsTradesDialogOpen(true)
      }
    }
  }, [trades, isPaywallOpen, isLoading])

  const handlePaywallClose = useCallback(() => {
    setIsPaywallOpen(false);
    // Update timestamp when user manually closes the modal
    localStorage.setItem('paywall_last_shown', Date.now().toString());
  }, []);

  if (!user) return null
  return (
    <>
      {isLoading && <LoadingOverlay />}
      <OnboardingModal />

      {/* Tooltip Portal for Sheet */}
      <div id="sheet-tooltip-portal" className="fixed inset-0 pointer-events-none z-[100]" />
      
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

      {!user?.isFirstConnection && (
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