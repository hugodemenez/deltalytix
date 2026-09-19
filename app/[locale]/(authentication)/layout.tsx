import AuthenticationLayoutClient from "./authentication-layout-client";
import { I18nProviderClient } from "@/locales/client";
import { resolveLocale } from "@/lib/locale-params";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo-urls";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

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
