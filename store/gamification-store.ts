import { create } from 'zustand'
import type { AchievementDef } from '@/lib/gamification/achievements'

interface GamificationStore {
  /** Queue of newly unlocked achievements waiting to be toasted */
  pendingToasts: AchievementDef[]
  enqueue:  (ach: AchievementDef) => void
  dequeue:  () => AchievementDef | undefined
  clearAll: () => void
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  pendingToasts: [],
  enqueue:  (ach) => set(s => ({ pendingToasts: [...s.pendingToasts, ach] })),
  dequeue:  ()    => {
    const [first, ...rest] = get().pendingToasts
    set({ pendingToasts: rest })
    return first
  },
  clearAll: () => set({ pendingToasts: [] }),
}))
