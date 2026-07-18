import AuthenticationLayoutClient from "./authentication-layout-client";
import { I18nProviderClient } from "@/locales/client";
import { resolveLocale } from "@/lib/locale-params";

export default async function AuthenticationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <AuthenticationLayoutClient>{children}</AuthenticationLayoutClient>
    </I18nProviderClient>
  );
}
