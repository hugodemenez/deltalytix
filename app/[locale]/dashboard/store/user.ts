import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Tag } from '@prisma/client'
import { loadInitialData } from '@/server/user-data'
import { createJSONStorage, persist } from 'zustand/middleware'

interface UserState {
  // User related
  user: User | null
  etpToken: string | null
  subscription: {
    isActive: boolean
    plan: string | null
    status: string
    endDate: Date | null
    trialEndsAt: Date | null
  } | null
  isFirstConnection: boolean
  isLoading: boolean
  isInitialLoad: boolean
  isMobile: boolean
  isSharedView: boolean
}

type UserStore = UserState & {
  setUser: (user: User | null) => void
  setEtpToken: (token: string | null) => void
  setSubscription: (subscription: UserState['subscription']) => void
  setIsFirstConnection: (value: boolean) => void
  setIsLoading: (value: boolean) => void
  setIsInitialLoad: (value: boolean) => void
  setIsMobile: (value: boolean) => void
  setIsSharedView: (value: boolean) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      etpToken: null,
      subscription: null,
      isFirstConnection: false,
      isLoading: false,
      isInitialLoad: true,
      isMobile: false,
      isSharedView: false,
      
      // Actions
      setUser: (user) => set({ user }),
      setEtpToken: (token) => set({ etpToken: token }),
      setSubscription: (subscription) => set({ subscription }),
      setIsFirstConnection: (value) => set({ isFirstConnection: value }),
      setIsLoading: (value) => set({ isLoading: value }),
      setIsInitialLoad: (value) => set({ isInitialLoad: value }),
      setIsMobile: (value) => set({ isMobile: value }),
      setIsSharedView: (value) => set({ isSharedView: value }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 