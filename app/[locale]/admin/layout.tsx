import AdminLayoutClient from "./admin-layout-client";
import { I18nProviderClient } from "@/locales/client";
import { getCachedLocale } from "@/lib/locale-params";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await getCachedLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </I18nProviderClient>
  );
}
