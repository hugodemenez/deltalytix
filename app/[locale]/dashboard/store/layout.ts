import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WidgetType, WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { saveDashboardLayout } from '@/server/database'
import { useUserStore } from './user'

import { StoreApi, UseBoundStore } from 'zustand'

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }

  return store
}


interface LayoutItem {
  i: string
  type: WidgetType
  size: WidgetSize
  x: number
  y: number
  w: number
  h: number
}

interface Layouts {
  desktop: LayoutItem[]
  mobile: LayoutItem[]
}

const defaultLayouts: Layouts = {
  desktop: [
    {
      i: "calendarWidget",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 1,
      w: 6,
      h: 8
    },
    {
      i: "equityChart",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 1,
      w: 6,
      h: 4
    },
    {
      i: "pnlChart",
      type: "pnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 5,
      w: 6,
      h: 4
    },
    {
      i: "cumulativePnl",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "longShortPerformance",
      type: "longShortPerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 3,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "tradePerformance",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 6,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "averagePositionTime",
      type: "averagePositionTime" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 9,
      y: 0,
      w: 3,
      h: 1
    }
  ],
  mobile: [
    {
      i: "calendarWidget",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 2,
      w: 12,
      h: 6
    },
    {
      i: "equityChart",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 8,
      w: 12,
      h: 6
    },
    {
      i: "cumulativePnl",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 1
    },
    {
      i: "tradePerformance",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 1,
      w: 12,
      h: 1
    }
  ]
}

interface LayoutState {
  layouts: Layouts | null
  setLayouts: (layouts: Layouts | null) => void
  saveLayouts: (newLayouts: Layouts) => Promise<void>
}

export const useLayoutStore = createSelectors(create<LayoutState>()(persist(set => ({
  layouts: defaultLayouts,
  setLayouts: (layouts) => set({ layouts }),
  saveLayouts: async (newLayouts: Layouts) => {
    try {
      const safeNewLayouts = {
        desktop: Array.isArray(newLayouts.desktop) ? newLayouts.desktop : defaultLayouts.desktop,
        mobile: Array.isArray(newLayouts.mobile) ? newLayouts.mobile : defaultLayouts.mobile,
      }

      const user = useUserStore.getState().user
      if (!user?.id) return

      await saveDashboardLayout(user.id, safeNewLayouts)
      set({ layouts: safeNewLayouts })
    } catch (error) {
      console.error('Error saving layouts:', error)
      set({ layouts: defaultLayouts })
    }
  }
}), {
  name: 'layout-storage',
  partialize: (state) => ({ layouts: state.layouts }),
})) as UseBoundStore<StoreApi<object>>) 