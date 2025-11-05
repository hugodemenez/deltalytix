import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type AuthPreference = 'magic' | 'password'

interface AuthPreferenceState {
  lastAuthPreference: AuthPreference
  setLastAuthPreference: (pref: AuthPreference) => void
  resetPreference: () => void
}

const defaultPreference: AuthPreference = 'magic'

export const useAuthPreferenceStore = create<AuthPreferenceState>()(
  persist(
    (set) => ({
      lastAuthPreference: defaultPreference,
      setLastAuthPreference: (pref) => set({ lastAuthPreference: pref }),
      resetPreference: () => set({ lastAuthPreference: defaultPreference }),
    }),
    {
      name: "auth-preference-store",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: any, version) => {
        // Coerce legacy 'signup' to 'magic'
        if (persistedState && persistedState.lastAuthPreference === 'signup') {
          return { ...persistedState, lastAuthPreference: 'magic' }
        }
        return persistedState as AuthPreferenceState
      }
    }
  )
)
