import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AnalysisInsight {
  type: 'positive' | 'negative' | 'neutral'
  message: string
  metric?: string
}

interface AnalysisSection {
  title: string
  description: string
  insights: AnalysisInsight[]
  score: number
  trend: 'up' | 'down' | 'neutral'
  recommendations: string[]
  lastUpdated: string
}

interface AnalysisData {
  global: AnalysisSection | null
  instrument: AnalysisSection | null
  accounts: AnalysisSection | null
  timeOfDay: AnalysisSection | null
  summary: string | null
  lastUpdated: string | null
}

interface AnalysisStore {
  data: AnalysisData
  isLoading: {
    global: boolean
    instrument: boolean
    accounts: boolean
    timeOfDay: boolean
  }
  error: {
    global: string | null
    instrument: string | null
    accounts: string | null
    timeOfDay: string | null
  }
  
  // Actions
  setSectionData: (section: keyof Omit<AnalysisData, 'summary' | 'lastUpdated'>, data: AnalysisSection) => void
  setSummary: (summary: string) => void
  setLoading: (section: keyof AnalysisStore['isLoading'], loading: boolean) => void
  setError: (section: keyof AnalysisStore['error'], error: string | null) => void
  resetSection: (section: keyof Omit<AnalysisData, 'summary' | 'lastUpdated'>) => void
  resetAll: () => void
  clearCache: () => void
  getSectionData: (section: keyof Omit<AnalysisData, 'summary' | 'lastUpdated'>) => AnalysisSection | null
  getSummary: () => string | null
  getLastUpdated: () => string | null
  isDataStale: (maxAgeMinutes?: number) => boolean
}

const initialData: AnalysisData = {
  global: null,
  instrument: null,
  accounts: null,
  timeOfDay: null,
  summary: null,
  lastUpdated: null
}

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      data: initialData,
      isLoading: {
        global: false,
        instrument: false,
        accounts: false,
        timeOfDay: false
      },
      error: {
        global: null,
        instrument: null,
        accounts: null,
        timeOfDay: null
      },

      setSectionData: (section, data) => set((state) => ({
        data: {
          ...state.data,
          [section]: {
            ...data,
            lastUpdated: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString()
        },
        isLoading: {
          ...state.isLoading,
          [section]: false
        },
        error: {
          ...state.error,
          [section]: null
        }
      })),

      setSummary: (summary) => set((state) => ({
        data: {
          ...state.data,
          summary,
          lastUpdated: new Date().toISOString()
        }
      })),

      setLoading: (section, loading) => set((state) => ({
        isLoading: {
          ...state.isLoading,
          [section]: loading
        },
        error: {
          ...state.error,
          [section]: null
        }
      })),

      setError: (section, error) => set((state) => ({
        error: {
          ...state.error,
          [section]: error
        },
        isLoading: {
          ...state.isLoading,
          [section]: false
        }
      })),

      resetSection: (section) => set((state) => ({
        data: {
          ...state.data,
          [section]: null
        },
        isLoading: {
          ...state.isLoading,
          [section]: false
        },
        error: {
          ...state.error,
          [section]: null
        }
      })),

      resetAll: () => set({
        data: initialData,
        isLoading: {
          global: false,
          instrument: false,
          accounts: false,
          timeOfDay: false
        },
        error: {
          global: null,
          instrument: null,
          accounts: null,
          timeOfDay: null
        }
      }),

      clearCache: () => {
        localStorage.removeItem('analysis-store')
        set({
          data: initialData,
          isLoading: {
            global: false,
            instrument: false,
            accounts: false,
            timeOfDay: false
          },
          error: {
            global: null,
            instrument: null,
            accounts: null,
            timeOfDay: null
          }
        })
      },

      getSectionData: (section) => {
        return get().data[section]
      },

      getSummary: () => {
        return get().data.summary
      },

      getLastUpdated: () => {
        return get().data.lastUpdated
      },

      isDataStale: (maxAgeMinutes = 60) => {
        const lastUpdated = get().data.lastUpdated
        if (!lastUpdated) return true
        
        const now = new Date()
        const updated = new Date(lastUpdated)
        const diffMinutes = (now.getTime() - updated.getTime()) / (1000 * 60)
        
        return diffMinutes > maxAgeMinutes
      }
    }),
    {
      name: 'analysis-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data, not loading states or errors
      partialize: (state) => ({ data: state.data }),
    }
  )
) 