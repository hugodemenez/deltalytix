import { createI18nServer } from 'next-international/server'

export const { getI18n, getScopedI18n, getCurrentLocale } = createI18nServer({
  en: () => import('./en'),
  fr: () => import('./fr'),
})