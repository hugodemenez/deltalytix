import { getStaticParams } from "@/locales/server";
import { I18nProviderClient } from "@/locales/client";
import { resolveLocale } from "@/lib/locale-params";
import { ConsentBanner } from "@/components/consent-banner";
import { ConsentRuntime } from "@/components/consent-runtime";

export function generateStaticParams() {
  return getStaticParams();
}

/**
 * Locale must be read from `params` to seed `I18nProviderClient`, so this
 * segment cannot share a URL-agnostic App Shell. Nested routes (e.g. dashboard
 * pages with `export const instant = true`) remain independently validated.
 */
export const instant = false;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <ConsentRuntime />
      <ConsentBanner />
      {children}
    </I18nProviderClient>
  );
}
