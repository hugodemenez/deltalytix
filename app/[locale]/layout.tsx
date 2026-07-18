import { getStaticParams } from "@/locales/server";
import { I18nProviderClient } from "@/locales/client";
import { getCachedLocale } from "@/lib/locale-params";

export function generateStaticParams() {
  return getStaticParams();
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await getCachedLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      {children}
    </I18nProviderClient>
  );
}
