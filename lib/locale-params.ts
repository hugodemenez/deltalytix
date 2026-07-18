import { cacheLife } from 'next/cache'

/**
 * Resolve `[locale]` route params under Cache Components.
 * Cached so layouts can await locale without blocking the static shell.
 */
export async function getCachedLocale(
  params: Promise<{ locale: string }>
): Promise<string> {
  'use cache'
  cacheLife('max')
  const { locale } = await params
  return locale
}
