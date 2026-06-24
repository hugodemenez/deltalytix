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

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function toString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function normalizeTemplateConfig(
  raw: unknown
): CustomPropfirmTemplateConfig | null {
  if (!raw || typeof raw !== "object") return null

  const config = raw as Record<string, unknown>
  const propfirm = toString(config.propfirm, "").trim()
  if (!propfirm) return null

  return {
    propfirm,
    startingBalance: toNumber(config.startingBalance, 0),
    profitTarget: toNumber(config.profitTarget, 0),
    drawdownThreshold: toNumber(config.drawdownThreshold, 0),
    consistencyPercentage: toNumber(config.consistencyPercentage, 100),
    trailingDrawdown: toBoolean(config.trailingDrawdown, false),
    trailingStopProfit: toNumber(config.trailingStopProfit, 0),
    accountSize: toString(config.accountSize, ""),
    accountSizeName: toString(config.accountSizeName, ""),
    price: toNumber(config.price, 0),
    priceWithPromo: toNumber(config.priceWithPromo, 0),
    evaluation: toBoolean(config.evaluation, false),
    minDays: toNumber(config.minDays, 0),
    dailyLoss: toNumber(config.dailyLoss, 0),
    rulesDailyLoss: toString(config.rulesDailyLoss, "No"),
    trailing: toString(config.trailing, "Static"),
    tradingNewsAllowed: toBoolean(config.tradingNewsAllowed, false),
    activationFees: toNumber(config.activationFees, 0),
    isRecursively: toString(config.isRecursively, "No"),
    balanceRequired: toNumber(config.balanceRequired, 0),
    minTradingDaysForPayout: toNumber(config.minTradingDaysForPayout, 0),
    minPnlToCountAsDay: toNumber(config.minPnlToCountAsDay, 0),
    buffer: toNumber(config.buffer, 0),
    considerBuffer: toBoolean(config.considerBuffer, true),
  }
}

function normalizeTemplates(templates: unknown): CustomPropfirmTemplate[] {
  if (!Array.isArray(templates)) return []

  return templates
    .map((template) => {
      if (!template || typeof template !== "object") return null

      const raw = template as Record<string, unknown>
      const config = normalizeTemplateConfig(raw.config)
      if (!config) return null

      const id = toString(raw.id, "")
      if (!id) return null

      return {
        id,
        firmName: toString(raw.firmName, config.propfirm).trim() || config.propfirm,
        sizeName: toString(raw.sizeName, ""),
        createdAt: toNumber(raw.createdAt, Date.now()),
        config,
      }
    })
    .filter((template): template is CustomPropfirmTemplate => template !== null)
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
        migrate: (persistedState) => {
          if (!persistedState || typeof persistedState !== "object") {
            return { templates: [] }
          }

          const state = persistedState as Partial<CustomPropfirmTemplatesStore>
          return {
            ...state,
            templates: normalizeTemplates(state.templates),
          }
        },
      }
    )
  )
