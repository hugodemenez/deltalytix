import { create } from 'zustand'
import { User, Subscription, Tag, Mood, DashboardLayout } from '@prisma/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { Group, Account } from '@/context/data-provider'
import { deleteGroupAction, saveGroupAction, updateGroupAction } from '@/server/groups'

type SubscriptionData = {
  id: string
  email: string
  plan: string
  status: string
  endDate: Date | null
  trialEndsAt: Date | null
} | null

type UserStore = {
  user: User | null
  supabaseUser: SupabaseUser | null
  subscription: SubscriptionData
  tags: Tag[]
  accounts: Account[]
  groups: Group[]
  moods: Mood[]
  dashboardLayout: {
    id: string
    userId: string
    desktop: any[]
    mobile: any[]
    createdAt: Date
    updatedAt: Date
  } | null
  isLoading: boolean
  isMobile: boolean
  isSharedView: boolean
  timezone: string
  setTimezone: (timezone: string) => void
  setUser: (user: User | null) => void
  setSupabaseUser: (supabaseUser: SupabaseUser | null) => void
  setSubscription: (subscription: Subscription | null) => void
  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void
  removeTag: (tagId: string) => void
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (accountId: string, data: Partial<Account>) => void
  removeAccount: (accountId: string) => void
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (groupId: string, data: Partial<Group>) => void
  removeGroup: (groupId: string) => void
  setMoods: (moods: Mood[]) => void
  addMood: (mood: Mood) => void
  updateMood: (moodId: string, data: Partial<Mood>) => void
  removeMood: (moodId: string) => void
  getMoodByDate: (date: Date) => Mood | undefined
  setDashboardLayout: (layout: DashboardLayout) => void
  updateDashboardLayout: (type: 'desktop' | 'mobile', layout: any[]) => void
  setIsLoading: (value: boolean) => void
  setIsMobile: (value: boolean) => void
  setIsSharedView: (value: boolean) => void
  resetUser: () => void
}

export const useUserStore = create<UserStore>()((
    (set, get) => ({
      user: null,
      supabaseUser: null,
      subscription: null,
      tags: [],
      accounts: [],
      groups: [],
      moods: [],
      dashboardLayout: null,
      isLoading: false,
      isMobile: false,
      isSharedView: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      setTimezone: (timezone: string) => set({ timezone }),
      setUser: (user) => set({ user }),
      setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
      setSubscription: (subscription) => set({ 
        subscription: subscription ? {
          id: subscription.id,
          email: subscription.email,
          plan: subscription.plan,
          status: subscription.status,
          endDate: subscription.endDate,
          trialEndsAt: subscription.trialEndsAt
        } : null 
      }),
      setTags: (tags) => set({ tags }),
      addTag: (tag) => set((state) => ({ 
        tags: [...state.tags, tag] 
      })),
      removeTag: (tagId) => set((state) => ({ 
        tags: state.tags.filter(tag => tag.id !== tagId) 
      })),
      setAccounts: (accounts) => set({ accounts }),
      addAccount: (account) => set((state) => ({ 
        accounts: [...state.accounts, account] 
      })),
      updateAccount: (accountId, data) => set((state) => ({
        accounts: state.accounts.map(account => 
          account.id === accountId ? { ...account, ...data } : account
        )
      })),
      removeAccount: (accountId) => set((state) => ({ 
        accounts: state.accounts.filter(account => account.id !== accountId) 
      })),
      setGroups: (groups) => set({ groups }),
      addGroup: async (group) => {
        try {
          // Update local state
          set((state) => ({ 
            groups: [...state.groups, group] 
          }))
          // Update database
          await saveGroupAction(group.id)
        } catch (error) {
          console.error('Error adding group:', error)
          throw error
        }
      },
      updateGroup: async (groupId, data) => {
        try {
          // Update local state
          set((state) => ({
            groups: state.groups.map(group => 
              group.id === groupId ? { ...group, ...data } : group
            )
          }))
          // Update database
          await updateGroupAction(groupId, data.name || '')
        } catch (error) {
          console.error('Error updating group:', error)
          throw error
        }
      },
      removeGroup: async (groupId) => {
        try {
          // Update local state
          set((state) => ({ 
            groups: state.groups.filter(group => group.id !== groupId) 
          }))
          // Update database
          await deleteGroupAction(groupId)
        } catch (error) {
          console.error('Error removing group:', error)
          throw error
        }
      },
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
      setDashboardLayout: (layout) => set({
        dashboardLayout: {
          id: layout.id,
          userId: layout.userId,
          desktop: typeof layout.desktop === 'string' ? JSON.parse(layout.desktop) : layout.desktop,
          mobile: typeof layout.mobile === 'string' ? JSON.parse(layout.mobile) : layout.mobile,
          createdAt: layout.createdAt,
          updatedAt: layout.updatedAt
        }
      }),
      updateDashboardLayout: (type, layout) => set((state) => ({
        dashboardLayout: state.dashboardLayout ? {
          ...state.dashboardLayout,
          [type]: layout
        } : {
          id: '',
          userId: '',
          desktop: type === 'desktop' ? layout : [],
          mobile: type === 'mobile' ? layout : [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })),
      setIsLoading: (value) => set({ isLoading: value }),
      setIsMobile: (value) => set({ isMobile: value }),
      setIsSharedView: (value) => set({ isSharedView: value }),
      resetUser: () => set({ 
        user: null, 
        subscription: null, 
        tags: [], 
        accounts: [], 
        groups: [],
        moods: [],
        dashboardLayout: null
      }),
    })
  )
) 