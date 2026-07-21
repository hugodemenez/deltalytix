import { create } from 'zustand'
import { SubscriptionWithPrice } from '@/server/billing'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'

interface StripeSubscriptionStore {
  // Stripe subscription data (detailed billing info)
  stripeSubscription: SubscriptionWithPrice | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setStripeSubscription: (subscription: SubscriptionWithPrice | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearSubscription: () => void
  refreshSubscription: () => Promise<void>
}

const bypassStripe = isLocalDashboardAuthBypassEnabled()

export const useStripeSubscriptionStore = create<StripeSubscriptionStore>()((set, get) => ({
  // Initial state — skip loading spinner under local auth bypass
  stripeSubscription: null,
  isLoading: !bypassStripe,
  error: null,
  
  // Actions
  setStripeSubscription: (subscription) => set({ 
    stripeSubscription: subscription,
    error: null 
  }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearSubscription: () => set({ 
    stripeSubscription: null,
    error: null 
  }),
  
  refreshSubscription: async () => {
    if (isLocalDashboardAuthBypassEnabled()) {
      set({ stripeSubscription: null, error: null, isLoading: false })
      return
    }
    try {
      set({ isLoading: true, error: null });
      const { getSubscriptionData } = await import('@/server/billing');
      const subscriptionData = await getSubscriptionData();
      set({ 
        stripeSubscription: subscriptionData,
        error: null 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh subscription',
        stripeSubscription: null 
      });
    } finally {
      set({ isLoading: false });
    }
  }
}))
