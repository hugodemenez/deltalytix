import { create } from 'zustand'
import { Mood } from '@/prisma/generated/prisma/browser'

type MoodStore = {
  moods: Mood[]
  setMoods: (moods: Mood[]) => void
  addMood: (mood: Mood) => void
  updateMood: (moodId: string, data: Partial<Mood>) => void
  removeMood: (moodId: string) => void
  getMoodByDate: (date: Date) => Mood | undefined
  resetMoods: () => void
}

export const useMoodStore = create<MoodStore>()((set, get) => ({
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
})) 