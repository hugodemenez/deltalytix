/**
 * Resolve `[locale]` route params.
 *
 * Do not wrap `params` Promises in `"use cache"` — request-bound promises
 * inside a cache scope hang prerender ("Filling a cache during prerender timed out").
 * With `generateStaticParams` on `app/[locale]/layout.tsx`, awaiting params is fine.
 */
export async function resolveLocale(
  params: Promise<{ locale: string }>
): Promise<string> {
  const { locale } = await params
  return locale
}
