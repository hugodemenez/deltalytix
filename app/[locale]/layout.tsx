import { getStaticParams } from "@/locales/server";
import { I18nProviderClient } from "@/locales/client";
import { resolveLocale } from "@/lib/locale-params";

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
  const locale = await resolveLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      {children}
    </I18nProviderClient>
  );
}
