import { create } from 'zustand'
import { SubscriptionWithPrice } from '@/server/billing'

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

export const useStripeSubscriptionStore = create<StripeSubscriptionStore>()((set, get) => ({
  // Initial state
  stripeSubscription: null,
  isLoading: true,
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
