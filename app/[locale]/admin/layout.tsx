import AdminLayoutClient from "./admin-layout-client";
import { I18nProviderClient } from "@/locales/client";
import { resolveLocale } from "@/lib/locale-params";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo-urls";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </I18nProviderClient>
  );
}
