import AuthenticationLayoutClient from "./authentication-layout-client";
import { I18nProviderClient } from "@/locales/client";

export default async function AuthenticationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <I18nProviderClient locale={locale}>
      <AuthenticationLayoutClient>{children}</AuthenticationLayoutClient>
    </I18nProviderClient>
  );
}
