import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, Subscription, Tag, DashboardLayout } from "@/prisma/generated/prisma/browser";
import { Prisma } from "@/prisma/generated/prisma/browser";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Group, Account } from "@/context/data-provider";
import { Widget } from "@/app/[locale]/dashboard/types/dashboard";
import {
  deleteGroupAction,
  saveGroupAction,
  updateGroupAction,
} from "@/server/groups";

type SubscriptionData = {
  id: string;
  email: string;
  plan: string;
  status: string;
  endDate: Date | null;
  trialEndsAt: Date | null;
} | null;

// Internal type with proper Widget[] types
export type DashboardLayoutWithWidgets = {
  id: string;
  userId: string;
  desktop: Widget[];
  mobile: Widget[];
  createdAt: Date;
  updatedAt: Date;
};

type UserStore = {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  subscription: SubscriptionData;
  tags: Tag[];
  accounts: Account[];
  groups: Group[];
  dashboardLayout: DashboardLayoutWithWidgets | null;
  isLoading: boolean;
  isMobile: boolean;
  isSharedView: boolean;
  timezone: string;
  setTimezone: (timezone: string) => void;
  setUser: (user: User | null) => void;
  setSupabaseUser: (supabaseUser: SupabaseUser | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  removeTag: (tagId: string) => void;
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (accountId: string, data: Partial<Account>) => void;
  removeAccount: (accountId: string) => void;
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (groupId: string, data: Partial<Group>) => void;
  removeGroup: (groupId: string) => void;
  setDashboardLayout: (layout: DashboardLayoutWithWidgets) => void;
  setIsLoading: (value: boolean) => void;
  setIsMobile: (value: boolean) => void;
  setIsSharedView: (value: boolean) => void;
  resetUser: () => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      supabaseUser: null,
      subscription: null,
      tags: [],
      accounts: [],
      groups: [],
      dashboardLayout: null,
      isLoading: false,
      isMobile: false,
      isSharedView: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      setTimezone: (timezone: string) => set({ timezone }),
      setUser: (user) => set({ user }),
      setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
      setSubscription: (subscription) =>
        set({
          subscription: subscription
            ? {
                id: subscription.id,
                email: subscription.email,
                plan: subscription.plan,
                status: subscription.status,
                endDate: subscription.endDate,
                trialEndsAt: subscription.trialEndsAt,
              }
            : null,
        }),
      setTags: (tags) => set({ tags }),
      addTag: (tag) =>
        set((state) => ({
          tags: [...state.tags, tag],
        })),
      removeTag: (tagId) =>
        set((state) => ({
          tags: state.tags.filter((tag) => tag.id !== tagId),
        })),
      setAccounts: (accounts) => set({ accounts }),
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
        })),
      updateAccount: (accountId, data) =>
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id === accountId ? { ...account, ...data } : account,
          ),
        })),
      removeAccount: (accountId) =>
        set((state) => ({
          accounts: state.accounts.filter(
            (account) => account.id !== accountId,
          ),
        })),
      setGroups: (groups) => set({ groups }),
      addGroup: async (group) => {
        try {
          // Update local state
          set((state) => ({
            groups: [...state.groups, group],
          }));
          // Update database
          await saveGroupAction(group.id);
        } catch (error) {
          console.error("Error adding group:", error);
          throw error;
        }
      },
      updateGroup: async (groupId, data) => {
        try {
          // Update local state
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, ...data } : group,
            ),
          }));
          // Update database
          await updateGroupAction(groupId, data.name || "");
        } catch (error) {
          console.error("Error updating group:", error);
          throw error;
        }
      },
      removeGroup: async (groupId) => {
        try {
          // Update local state
          set((state) => ({
            groups: state.groups.filter((group) => group.id !== groupId),
          }));
          // Update database
          await deleteGroupAction(groupId);
        } catch (error) {
          console.error("Error removing group:", error);
          throw error;
        }
      },
      setDashboardLayout: (layout) =>
        set({
          dashboardLayout: {
            id: layout.id,
            userId: layout.userId,
            desktop:
              typeof layout.desktop === "string"
                ? JSON.parse(layout.desktop)
                : (layout.desktop as Widget[]),
            mobile:
              typeof layout.mobile === "string"
                ? JSON.parse(layout.mobile)
                : (layout.mobile as Widget[]),
            createdAt: layout.createdAt,
            updatedAt: layout.updatedAt,
          },
        }),

      setIsLoading: (value) => set({ isLoading: value }),
      setIsMobile: (value) => set({ isMobile: value }),
      setIsSharedView: (value) => set({ isSharedView: value }),
      resetUser: () =>
        set({
          user: null,
          subscription: null,
          tags: [],
          accounts: [],
          groups: [],
          dashboardLayout: null,
        }),
    }),
    {
      name: "deltalytix-user-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist timezone and other non-sensitive settings
      partialize: (state) => ({
        dashboardLayout: state.dashboardLayout,
        timezone: state.timezone,
        isMobile: state.isMobile,
        isSharedView: state.isSharedView,
      }),
    },
  ),
);
