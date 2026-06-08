"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/**
 * Serializable subset of an account's prop firm configuration.
 * These are the fields that get applied to an account when a template is loaded.
 */
export interface CustomPropfirmTemplateConfig {
  propfirm: string
  startingBalance: number
  profitTarget: number
  drawdownThreshold: number
  consistencyPercentage: number
  trailingDrawdown: boolean
  trailingStopProfit: number
  accountSize: string
  accountSizeName: string
  price: number
  priceWithPromo: number
  evaluation: boolean
  minDays: number
  dailyLoss: number
  rulesDailyLoss: string
  trailing: string
  tradingNewsAllowed: boolean
  activationFees: number
  isRecursively: string
  balanceRequired: number
  minTradingDaysForPayout: number
  minPnlToCountAsDay: number
  buffer: number
  considerBuffer: boolean
}

export interface CustomPropfirmTemplate {
  id: string
  /** Prop firm name, used to group/label the template */
  firmName: string
  /** Account size label (e.g. "50K", "Funded 100K") */
  sizeName: string
  createdAt: number
  config: CustomPropfirmTemplateConfig
}

interface CustomPropfirmTemplatesStore {
  templates: CustomPropfirmTemplate[]
  addTemplate: (
    template: Omit<CustomPropfirmTemplate, "id" | "createdAt">
  ) => CustomPropfirmTemplate
  removeTemplate: (id: string) => void
  updateTemplate: (
    id: string,
    updates: Partial<Omit<CustomPropfirmTemplate, "id" | "createdAt">>
  ) => void
  clearTemplates: () => void
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const useCustomPropfirmTemplatesStore =
  create<CustomPropfirmTemplatesStore>()(
    persist(
      (set) => ({
        templates: [],
        addTemplate: (template) => {
          const newTemplate: CustomPropfirmTemplate = {
            ...template,
            id: generateId(),
            createdAt: Date.now(),
          }
          set((state) => ({ templates: [newTemplate, ...state.templates] }))
          return newTemplate
        },
        removeTemplate: (id) =>
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
          })),
        updateTemplate: (id, updates) =>
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          })),
        clearTemplates: () => set({ templates: [] }),
      }),
      {
        name: "custom-propfirm-templates-store",
        storage: createJSONStorage(() => localStorage),
        version: 1,
      }
    )
  )
