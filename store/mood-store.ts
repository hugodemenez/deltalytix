import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Mood } from '@prisma/client'

type MoodStore = {
  moods: Mood[]
  setMoods: (moods: Mood[]) => void
  addMood: (mood: Mood) => void
  updateMood: (moodId: string, data: Partial<Mood>) => void
  removeMood: (moodId: string) => void
  getMoodByDate: (date: Date) => Mood | undefined
  resetMoods: () => void
}

export const useMoodStore = create<MoodStore>()(
  persist(
    (set, get) => ({
      moods: [],
      
      setMoods: (moods) => set({ moods }),
      
      addMood: (mood) => set((state) => ({ 
        moods: [...state.moods, mood] 
      })),
      
      updateMood: (moodId, data) => set((state) => ({
        moods: state.moods.map(mood => 
          mood.id === moodId ? { ...mood, ...data } : mood
        )
      })),
      
      removeMood: (moodId) => set((state) => ({ 
        moods: state.moods.filter(mood => mood.id !== moodId) 
      })),
      
      getMoodByDate: (date) => {
        const dateStr = date.toISOString().split('T')[0]
        return get().moods.find(mood => 
          mood.day.toISOString().split('T')[0] === dateStr
        )
      },
      
      resetMoods: () => set({ moods: [] }),
    }),
    {
      name: 'delatlytix-mood-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Handle date deserialization for moods
          state.moods = state.moods.map(mood => ({
            ...mood,
            day: new Date(mood.day),
            createdAt: new Date(mood.createdAt),
            updatedAt: new Date(mood.updatedAt)
          }))
        }
      },
      version: 1,
    }
  )
) 