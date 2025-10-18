import { createI18nServer } from 'next-international/server'

export const { getI18n, getScopedI18n, getCurrentLocale } = createI18nServer({
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