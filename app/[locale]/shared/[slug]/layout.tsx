import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProviderClient } from "@/locales/client";
import { resolveLocale } from "@/lib/locale-params";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <ThemeProvider>
          <DataProvider isSharedView>
            <div className="min-h-screen flex flex-col bg-background">
              <Toaster />
              <div className="flex-1">
                {children}
              </div>
            </div>
          </DataProvider>
      </ThemeProvider>
    </I18nProviderClient>
  );
}
