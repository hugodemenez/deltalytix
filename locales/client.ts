"use client"
import { createI18nClient } from 'next-international/client'

export const { useI18n, useScopedI18n, I18nProviderClient, useChangeLocale, useCurrentLocale } = createI18nClient({
  en: () => import('./en'),
  fr: () => import('./fr'),
  de: () => import('./de'),
  es: () => import('./es'),
  it: () => import('./it'),
  pt: () => import('./pt'),
  vi: () => import('./vi'),
  hi: () => import('./hi'),
  ja: () => import('./ja'),
  zh: () => import('./zh'),
  yo: () => import('./yo'),
})