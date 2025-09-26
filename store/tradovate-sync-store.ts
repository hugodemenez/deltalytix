import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TradovateAccount {
  id: number
  name: string
  nickname: string
  accountType: string
  active: boolean
  clearingHouse: string
  riskCategoryId: number
  autoLiqProfileId: number
  marginCalculationType: string
  legalStatus: string
  nickname2?: string
}

type TradovateEnvironment = 'demo' | 'live'

interface TradovateOAuthState {
  isAuthenticated: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  accounts?: TradovateAccount[]
  lastSync?: string
  oauthState?: string // For OAuth flow security
  environment: TradovateEnvironment // Add environment selection
}

interface TradovateSyncStore extends TradovateOAuthState {
  // Actions
  setAuthenticated: (authenticated: boolean) => void
  setTokens: (accessToken: string, refreshToken: string, expiresAt: string) => void
  setAccounts: (accounts: TradovateAccount[]) => void
  setOAuthState: (state: string) => void
  clearOAuthState: () => void
  updateLastSync: () => void
  clearAll: () => void
  isTokenExpired: () => boolean
  getValidToken: () => string | null
  setEnvironment: (environment: TradovateEnvironment) => void
  getApiBaseUrl: () => string
  syncWithSessionStorage: () => void
  loadFromSessionStorage: () => boolean
}

export const useTradovateSyncStore = create<TradovateSyncStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
      accounts: undefined,
      lastSync: undefined,
      oauthState: undefined,
      environment: 'demo', // Default to demo for safety

      // Actions
      setAuthenticated: (authenticated: boolean) => {
        set({ isAuthenticated: authenticated })
      },

      setTokens: (accessToken: string, refreshToken: string, expiresAt: string) => {
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          expiresAt
        })
        // Automatically sync with sessionStorage for web worker
        sessionStorage.setItem('tradovate_access_token', accessToken)
        sessionStorage.setItem('tradovate_token_expiration', expiresAt)
        sessionStorage.setItem('tradovate_environment', get().environment)
      },

      setAccounts: (accounts: TradovateAccount[]) => {
        set({ accounts })
      },

      setOAuthState: (oauthState: string) => {
        set({ oauthState })
      },

      clearOAuthState: () => {
        set({ oauthState: undefined })
      },

      updateLastSync: () => {
        set({ lastSync: new Date().toISOString() })
      },

      clearAll: () => {
        set({
          isAuthenticated: false,
          accessToken: undefined,
          refreshToken: undefined,
          expiresAt: undefined,
          accounts: undefined,
          lastSync: undefined,
          oauthState: undefined
          // Keep environment setting when clearing
        })
      },

      isTokenExpired: () => {
        const state = get()
        if (!state.expiresAt) return true
        // Add 5-minute buffer to refresh before actual expiration
        const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
        return Date.now() > (new Date(state.expiresAt).getTime() - bufferTime)
      },

      getValidToken: () => {
        const state = get()
        if (!state.accessToken || state.isTokenExpired()) {
          return null
        }
        return state.accessToken
      },

      setEnvironment: (environment: TradovateEnvironment) => {
        // Clear tokens when switching environments
        set({
          environment,
          isAuthenticated: false,
          accessToken: undefined,
          refreshToken: undefined,
          expiresAt: undefined,
          accounts: undefined,
          lastSync: undefined,
          oauthState: undefined
        })
      },

      getApiBaseUrl: () => {
        const state = get()
        return state.environment === 'demo' 
          ? 'https://demo.tradovateapi.com' 
          : 'https://live.tradovateapi.com'
      },

      // Sync tokens with sessionStorage for web worker
      syncWithSessionStorage: () => {
        const state = get()
        if (state.accessToken && state.expiresAt) {
          sessionStorage.setItem('tradovate_access_token', state.accessToken)
          sessionStorage.setItem('tradovate_token_expiration', state.expiresAt)
          sessionStorage.setItem('tradovate_environment', state.environment)
        } else {
          sessionStorage.removeItem('tradovate_access_token')
          sessionStorage.removeItem('tradovate_token_expiration')
          sessionStorage.removeItem('tradovate_environment')
        }
      },

      // Load tokens from sessionStorage
      loadFromSessionStorage: () => {
        const accessToken = sessionStorage.getItem('tradovate_access_token')
        const expiresAt = sessionStorage.getItem('tradovate_token_expiration')
        const environment = sessionStorage.getItem('tradovate_environment') as 'demo' | 'live' || 'demo'
        
        if (accessToken && expiresAt) {
          set({
            isAuthenticated: true,
            accessToken,
            expiresAt,
            environment
          })
          return true
        }
        return false
      }
    }),
    {
      name: 'tradovate-sync-storage', // unique name for localStorage key
              partialize: (state) => ({
          // Only persist these fields
          isAuthenticated: state.isAuthenticated,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          expiresAt: state.expiresAt,
          accounts: state.accounts,
          lastSync: state.lastSync,
          environment: state.environment,
          oauthState: state.oauthState // Temporarily persist for OAuth flow - cleared after use
        }),
    }
  )
) 